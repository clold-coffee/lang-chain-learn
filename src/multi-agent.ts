import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  createAgent,
  AIMessage,
  ToolMessage,
  tool,
  type ToolRuntime,
} from "langchain";
import {
  StateGraph,
  START,
  END,
  StateSchema,
  MessagesValue,
  Command,
  MemorySaver,
  type GraphNode,
} from "@langchain/langgraph";
import { z } from "zod";
import { v7 as uuidv7 } from "uuid";

// 1. 初始化模型
const model = new ChatOpenAI({
  model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  },
  temperature: 0.3,
});

// 2. 多 Agent 共用状态
const MultiAgentState = new StateSchema({
  messages: MessagesValue,
  activeAgent: z.enum(["sales_agent", "support_agent"]).optional(),
});

// 3. support_agent 转 sales_agent 的工具
const transferToSales = tool(
  async (_input, runtime: ToolRuntime<typeof MultiAgentState.State>) => {
    const lastAiMessage = [...runtime.state.messages]
      .reverse()
      .find(AIMessage.isInstance);

    const transferMessage = new ToolMessage({
      content: "已从技术支持转接到销售 Agent。",
      tool_call_id: runtime.toolCallId,
    });

    return new Command({
      goto: "sales_agent",
      update: {
        activeAgent: "sales_agent",
        messages: [lastAiMessage, transferMessage].filter(Boolean),
      },
      graph: Command.PARENT,
    });
  },
  {
    name: "transfer_to_sales",
    description: "当用户询问价格、购买、套餐、报价时，转接给销售 Agent。",
    schema: z.object({}),
  }
);

// 4. sales_agent 转 support_agent 的工具
const transferToSupport = tool(
  async (_input, runtime: ToolRuntime<typeof MultiAgentState.State>) => {
    const lastAiMessage = [...runtime.state.messages]
      .reverse()
      .find(AIMessage.isInstance);

    const transferMessage = new ToolMessage({
      content: "已从销售转接到技术支持 Agent。",
      tool_call_id: runtime.toolCallId,
    });

    return new Command({
      goto: "support_agent",
      update: {
        activeAgent: "support_agent",
        messages: [lastAiMessage, transferMessage].filter(Boolean),
      },
      graph: Command.PARENT,
    });
  },
  {
    name: "transfer_to_support",
    description: "当用户询问故障、报错、登录失败、技术问题时，转接给技术支持 Agent。",
    schema: z.object({}),
  }
);

// 5. 销售 Agent
const salesAgent = createAgent({
  model,
  tools: [transferToSupport],
  systemPrompt: `
你是销售 Agent。

你负责：
1. 产品价格
2. 购买方式
3. 套餐差异
4. 报价说明

如果用户问的是技术故障、登录失败、报错、设备问题，
你必须调用 transfer_to_support 转给技术支持 Agent。

请用中文简洁回答。
`,
});

// 6. 技术支持 Agent
const supportAgent = createAgent({
  model,
  tools: [transferToSales],
  systemPrompt: `
你是技术支持 Agent。

你负责：
1. 登录失败
2. 系统报错
3. 设备故障
4. 使用问题

如果用户问的是价格、购买、报价、套餐，
你必须调用 transfer_to_sales 转给销售 Agent。

请用中文简洁回答。
`,
});

// 7. 把 Agent 包装成 graph node
const callSalesAgent: GraphNode<typeof MultiAgentState.State> = async (state) => {
  return await salesAgent.invoke(state);
};

const callSupportAgent: GraphNode<typeof MultiAgentState.State> = async (
  state
) => {
  return await supportAgent.invoke(state);
};

// 8. 初始路由：默认先进 support_agent
const routeInitial = (state: typeof MultiAgentState.State) => {
  return state.activeAgent ?? "support_agent";
};

// 9. 每个 Agent 跑完后，判断是否结束
const routeAfterAgent = (state: typeof MultiAgentState.State) => {
  const messages = state.messages ?? [];
  const lastMsg = messages.at(-1);

  // 如果最后一条是 AIMessage 且没有 tool_calls，说明 Agent 已经正常回复用户，可以结束
  if (lastMsg instanceof AIMessage && !lastMsg.tool_calls?.length) {
    return END;
  }

  // 如果刚才发生了 transfer tool，activeAgent 会被更新
  return state.activeAgent ?? "support_agent";
};

// 10. 构建父图
const graph = new StateGraph(MultiAgentState)
  .addNode("sales_agent", callSalesAgent)
  .addNode("support_agent", callSupportAgent)
  .addConditionalEdges(START, routeInitial, [
    "sales_agent",
    "support_agent",
  ])
  .addConditionalEdges("sales_agent", routeAfterAgent, [
    "sales_agent",
    "support_agent",
    END,
  ])
  .addConditionalEdges("support_agent", routeAfterAgent, [
    "sales_agent",
    "support_agent",
    END,
  ])
  .compile({
    checkpointer: new MemorySaver(),
  });

// 11. 测试多轮对话
async function main() {
  const threadId = uuidv7();
  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  console.log("\n=== Turn 1：技术问题，默认进入 support_agent ===");
  let result = await graph.invoke(
    {
      activeAgent: "support_agent",
      messages: [
        {
          role: "user",
          content: "我的账号登录不上，一直提示系统错误。",
        },
      ],
    },
    config
  );

  console.log("activeAgent =", result.activeAgent);
  console.log(result.messages.at(-1)?.content);

  console.log("\n=== Turn 2：用户改问价格，support_agent 应该转 sales_agent ===");
  result = await graph.invoke(
    {
      messages: [
        {
          role: "user",
          content: "那如果我想买企业版，大概多少钱？",
        },
      ],
    },
    config
  );

  console.log("activeAgent =", result.activeAgent);
  console.log(result.messages.at(-1)?.content);

  console.log("\n=== Turn 3：用户又问技术问题，sales_agent 应该转 support_agent ===");
  result = await graph.invoke(
    {
      messages: [
        {
          role: "user",
          content: "如果购买后还是登录失败怎么办？",
        },
      ],
    },
    config
  );

  console.log("activeAgent =", result.activeAgent);
  console.log(result.messages.at(-1)?.content);
}

main().catch(console.error);