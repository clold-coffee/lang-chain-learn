import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  createAgent,
  createMiddleware,
  tool,
  ToolMessage,
  type ToolRuntime,
} from "langchain";
import { Command, MemorySaver, StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import { v7 as uuidv7 } from "uuid";

// 1. 初始化模型：这里用 DeepSeek 的 OpenAI 兼容接口
const model = new ChatOpenAI({
  model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  },
  temperature: 0.3,
});

// 2. 定义流程状态
const SupportStepSchema = z.enum([
  "warranty_collector",
  "issue_classifier",
  "resolution_specialist",
]);

const WarrantyStatusSchema = z.enum(["in_warranty", "out_of_warranty"]);
const IssueTypeSchema = z.enum(["hardware", "software"]);

const SupportState = new StateSchema({
  currentStep: SupportStepSchema.optional(),
  warrantyStatus: WarrantyStatusSchema.optional(),
  issueType: IssueTypeSchema.optional(),
});

// 3. 工具：记录保修状态，并把流程推进到“问题分类”
const recordWarrantyStatusSchema = z.object({
  status: WarrantyStatusSchema,
});

const recordWarrantyStatus = tool(
  async (
    input: z.infer<typeof recordWarrantyStatusSchema>,
    runtime: ToolRuntime<typeof SupportState.State>
  ) => {
    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: `已记录保修状态：${input.status}`,
            tool_call_id: runtime.toolCallId,
          }),
        ],
        warrantyStatus: input.status,
        currentStep: "issue_classifier",
      },
    });
  },
  {
    name: "record_warranty_status",
    description: "记录用户设备是否在保修期，并进入问题分类阶段。",
    schema: recordWarrantyStatusSchema,
  }
);



// 4. 工具：记录问题类型，并把流程推进到“解决方案”
const recordIssueTypeSchema = z.object({
  issueType: IssueTypeSchema,
});

const recordIssueType = tool(
  async (
    input: z.infer<typeof recordIssueTypeSchema>,
    runtime: ToolRuntime<typeof SupportState.State>
  ) => {
    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: `已记录问题类型：${input.issueType}`,
            tool_call_id: runtime.toolCallId,
          }),
        ],
        issueType: input.issueType,
        currentStep: "resolution_specialist",
      },
    });
  },
  {
    name: "record_issue_type",
    description: "记录用户的问题类型：hardware 或 software，并进入解决方案阶段。",
    schema: recordIssueTypeSchema,
  }
);

// 5. 普通工具：提供解决方案
const provideSolution = tool(
  async (input: { solution: string }) => {
    return `已给用户解决方案：${input.solution}`;
  },
  {
    name: "provide_solution",
    description: "给用户一个具体的解决方案。",
    schema: z.object({
      solution: z.string(),
    }),
  }
);

// 6. 普通工具：升级人工
const escalateToHuman = tool(
  async (input: { reason: string }) => {
    return `已升级人工客服，原因：${input.reason}`;
  },
  {
    name: "escalate_to_human",
    description: "当无法自动解决时，升级给人工客服。",
    schema: z.object({
      reason: z.string(),
    }),
  }
);

// 7. 每个阶段对应一套 prompt + tools
const WARRANTY_COLLECTOR_PROMPT = `
你是一个中文售后客服。

当前阶段：保修确认阶段。

你的任务：
1. 先询问用户设备是否还在保修期。
2. 如果用户已经说明在保修期或不在保修期，必须调用 record_warranty_status。
3. 不要直接进入问题分类，必须先记录保修状态。
`;

const ISSUE_CLASSIFIER_PROMPT = `
你是一个中文售后客服。

当前阶段：问题分类阶段。

已知信息：
- 保修状态：{warrantyStatus}

你的任务：
1. 询问或判断用户的问题属于 hardware 还是 software。
2. hardware 表示物理损坏、屏幕碎裂、按键损坏、电池鼓包等。
3. software 表示系统卡顿、App 崩溃、登录失败、软件报错等。
4. 判断清楚后，必须调用 record_issue_type。
`;

const RESOLUTION_SPECIALIST_PROMPT = `
你是一个中文售后客服。

当前阶段：解决方案阶段。

已知信息：
- 保修状态：{warrantyStatus}
- 问题类型：{issueType}

你的任务：
1. 如果是 software，调用 provide_solution 给排查步骤。
2. 如果是 hardware 且 in_warranty，调用 provide_solution 告诉用户走保修维修。
3. 如果是 hardware 且 out_of_warranty，调用 escalate_to_human，说明需要人工确认付费维修方案。
4. 工具调用后，再用中文给用户一个简洁回复。
`;

const STEP_CONFIG = {
  warranty_collector: {
    prompt: WARRANTY_COLLECTOR_PROMPT,
    tools: [recordWarrantyStatus],
    requires: [],
  },
  issue_classifier: {
    prompt: ISSUE_CLASSIFIER_PROMPT,
    tools: [recordIssueType],
    requires: ["warrantyStatus"],
  },
  resolution_specialist: {
    prompt: RESOLUTION_SPECIALIST_PROMPT,
    tools: [provideSolution, escalateToHuman],
    requires: ["warrantyStatus", "issueType"],
  },
} as const;

// 8. middleware：根据 currentStep 动态切换 prompt/tools
const applyStepMiddleware = createMiddleware({
  name: "applyStepMiddleware",
  stateSchema: SupportState,

  wrapModelCall: async (request, handler) => {
    const currentStep = request.state.currentStep ?? "warranty_collector";
    const stepConfig = STEP_CONFIG[currentStep];

    // 检查进入当前阶段前，依赖字段是否已经存在
    for (const key of stepConfig.requires) {
      if (request.state[key] === undefined) {
        throw new Error(`进入 ${currentStep} 前，缺少状态字段：${key}`);
      }
    }

    // 把 state 注入 prompt
    let systemPrompt:string = stepConfig.prompt;
    for (const [key, value] of Object.entries(request.state)) {
      systemPrompt = systemPrompt.replaceAll(`{${key}}`, String(value ?? ""));
    }
    console.log("--systemPrompt--",systemPrompt)

    return handler({
      ...request,
      systemPrompt,
      tools: [...stepConfig.tools],
    });
  },
});

// 9. 创建单 Agent
const singleAgent = createAgent({
  model,
  tools: [
    recordWarrantyStatus,
    recordIssueType,
    provideSolution,
    escalateToHuman,
  ],
  stateSchema: SupportState,
  middleware: [applyStepMiddleware],
  checkpointer: new MemorySaver(),
});

// 10. 测试多轮对话
async function main() {
  const threadId = uuidv7();
  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  console.log("\n=== Turn 1：用户提出问题 ===");
  let result = await singleAgent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "你好，我的手机屏幕碎了。",
        },
      ],
    },
    config
  );
  console.log(result.messages.at(-1)?.content);
  console.log("currentStep =", result.currentStep);

  console.log("\n=== Turn 2：用户说明保修状态 ===");
  result = await singleAgent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "还在保修期内。",
        },
      ],
    },
    config
  );
  console.log(result.messages.at(-1)?.content);
  console.log("currentStep =", result.currentStep);
  console.log("warrantyStatus =", result.warrantyStatus);

  console.log("\n=== Turn 3：用户说明问题类型 ===");
  result = await singleAgent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "是我摔了一下，屏幕物理破裂。",
        },
      ],
    },
    config
  );
  console.log(result.messages.at(-1)?.content);
  console.log("currentStep =", result.currentStep);
  console.log("issueType =", result.issueType);

  console.log("\n=== Turn 4：进入解决方案阶段 ===");
  result = await singleAgent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "那我现在应该怎么办？",
        },
      ],
    },
    config
  );
  console.log(result.messages.at(-1)?.content);
}

main().catch(console.error);