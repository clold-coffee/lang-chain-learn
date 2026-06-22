import "dotenv/config";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

type TavilyTopic = "general" | "news" | "finance";

type TavilySearchResult = {
  title?: string;
  url: string;
  content?: string;
  score?: number;
};

function getEnvNumber(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function assertRequiredEnv() {
  const modelApiKey = process.env.OPENAI_API_KEY ?? process.env.DEEPSEEK_API_KEY;

  const missing: string[] = [];

  if (!modelApiKey) {
    missing.push("OPENAI_API_KEY 或 DEEPSEEK_API_KEY");
  }

  if (!process.env.TAVILY_API_KEY) {
    missing.push("TAVILY_API_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      [
        "缺少必要环境变量：",
        missing.map((item) => `- ${item}`).join("\n"),
        "",
        "请先在项目根目录创建 .env 文件，并填写对应的 API Key。",
      ].join("\n"),
    );
  }
}

function normalizeHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWebpageContent(
  url: string,
  timeoutMs = 10_000,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        // 有些网页会拒绝默认 Node fetch，这里伪装成普通浏览器访问
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return `网页抓取失败：${url}\nHTTP 状态码：${response.status}`;
    }

    const html = await response.text();
    const text = normalizeHtmlToText(html);

    // 本地实践先限制网页内容长度，避免一次性塞太多 token 给模型
    const maxChars = getEnvNumber("MAX_PAGE_CHARS", 12_000);

    return text.slice(0, maxChars);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return `网页抓取失败：${url}\n失败原因：${message}`;
  } finally {
    clearTimeout(timer);
  }
}

const tavilySearchInputSchema = z.object({
  query: z.string().min(1).describe("要搜索的问题或关键词"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .default(2)
    .describe("最多返回几个搜索结果。本地实践建议 1 到 3 个。"),
  topic: z
    .enum(["general", "news", "finance"])
    .optional()
    .default("general")
    .describe("搜索类型：general 普通搜索，news 新闻，finance 金融。"),
});

const tavilySearch = tool(
  async (input: z.infer<typeof tavilySearchInputSchema>) => {
    const { query, maxResults = 2, topic = "general" } = input;

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        topic,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      const text = await response.text();

      return [
        `Tavily 搜索失败。`,
        `HTTP 状态码：${response.status}`,
        `返回内容：${text}`,
      ].join("\n");
    }

    const data = (await response.json()) as {
      results?: TavilySearchResult[];
      error?: string;
    };

    if (data.error) {
      return `Tavily 返回错误：${data.error}`;
    }

    const results = data.results ?? [];

    if (results.length === 0) {
      return `没有找到和「${query}」相关的搜索结果。`;
    }

    const resultTexts: string[] = [];

    for (const [index, result] of results.entries()) {
      const title = result.title ?? "未命名网页";
      const content = await fetchWebpageContent(result.url);

      resultTexts.push(
        [
          `### 来源 ${index + 1}：${title}`,
          `URL：${result.url}`,
          "",
          `网页正文摘录：`,
          content,
        ].join("\n"),
      );
    }

    return [
      `针对查询「${query}」，共找到 ${resultTexts.length} 个结果：`,
      "",
      resultTexts.join("\n\n---\n\n"),
    ].join("\n");
  },
  {
    name: "tavily_search",
    description:
      "搜索互联网资料，并抓取网页正文，返回网页标题、URL 和正文摘录，供研究 Agent 分析。",
    schema: tavilySearchInputSchema,
  },
);

const RESEARCH_WORKFLOW_INSTRUCTIONS = `
# 深度研究工作流

你是主研究 Agent，负责规划、委托、综合和输出报告。

所有输出都使用中文。

你需要严格按照下面流程处理用户的研究请求：

1. 规划任务：
   - 先使用 write_todos 工具拆解研究任务。
   - 不要一上来就写最终答案。
   - 每个 TODO 应该是一个清晰、可执行的研究步骤。

2. 保存原始需求：
   - 使用 write_file 工具，把用户的原始研究问题保存到 ./research_request.md。
   - 保存后再开始研究，避免后面偏离用户问题。

3. 委托研究：
   - 外部资料搜索必须优先委托给 research-agent 子 Agent。
   - 主 Agent 不要在主上下文里做大量网页搜索。
   - 子 Agent 的作用是隔离上下文，避免搜索结果污染主 Agent 的综合判断。

4. 综合发现：
   - 阅读所有子 Agent 的研究结果。
   - 合并重复信息。
   - 对同一个 URL 只分配一个引用编号。
   - 不要编造来源，不要编造数据。

5. 写最终报告：
   - 使用 write_file 工具，把完整报告写入 ./final_report.md。
   - 报告必须结构清晰，适合人类阅读。

6. 最终输出：
   - 最终消息直接输出 ./final_report.md 的正文。
   - 不要只说“报告已完成”。
   - 用户需要在终端直接看到完整报告。

## 报告格式要求

如果是对比类问题，使用这个结构：

## 结论先行
## 背景说明
## 对比维度一
## 对比维度二
## 对比维度三
## 适用场景
## 总结
## Sources

如果是概览类问题，使用这个结构：

## 结论先行
## 核心概念
## 关键机制
## 典型应用
## 风险与限制
## 总结
## Sources

如果是列表类问题，使用这个结构：

## 结论先行
## 1. 条目一
## 2. 条目二
## 3. 条目三
## 总结
## Sources

## 引用要求

- 正文中使用 [1]、[2]、[3] 这样的格式引用来源。
- Sources 部分列出对应 URL。
- 不允许出现没有来源支撑的关键事实。
- 无法确认的信息要明确写“未能从可靠来源确认”。
`;

const RESEARCHER_INSTRUCTIONS = `
你是 research-agent，是专门负责网页研究的子 Agent。

今天日期是：{date}

你的任务是围绕主 Agent 交给你的单个研究主题进行资料检索、网页阅读和事实整理。

所有输出都使用中文。

## 你可以使用的工具

你可以使用 tavily_search 工具搜索互联网资料。

## 研究流程

1. 先读懂问题：
   - 明确用户到底要什么。
   - 判断需要事实、数据、案例、定义，还是对比分析。

2. 先宽后窄：
   - 第一次搜索可以宽泛一些。
   - 如果结果不够，再使用更具体的关键词搜索。

3. 每次搜索后都要判断：
   - 已经找到了什么？
   - 还缺什么？
   - 是否已经足够回答？

4. 控制搜索次数：
   - 简单问题最多搜索 2 到 3 次。
   - 复杂问题最多搜索 5 次。
   - 如果连续两次搜索结果高度重复，就停止搜索。

5. 返回研究结果：
   - 用清晰标题整理发现。
   - 每个关键事实都要带来源编号。
   - 最后必须给出 Sources 部分。

## 输出格式

## 研究结论

用几段话说明你找到的核心结论。

## 关键发现

### 发现一
说明事实，并引用来源。

### 发现二
说明事实，并引用来源。

### 发现三
说明事实，并引用来源。

## 仍不确定的信息

列出没有找到可靠来源确认的信息。没有则写“暂无”。

## Sources

[1] 来源标题：URL
[2] 来源标题：URL
`;

const SUBAGENT_DELEGATION_INSTRUCTIONS = `
# 子 Agent 委托策略

你的职责是协调研究，而不是自己完成所有搜索。

## 默认策略

大多数问题先使用 1 个 research-agent 子 Agent。

例如：

- “研究 RAG 是什么” -> 1 个子 Agent
- “总结 LangGraph 的核心能力” -> 1 个子 Agent
- “调研某个行业的发展趋势” -> 1 个子 Agent

## 需要并行多个子 Agent 的情况

只有当问题明显包含多个独立维度时，才并行多个子 Agent。

例如：

- “比较 OpenAI、Anthropic、Google 的 Agent 产品” -> 可以拆成 3 个子 Agent
- “研究中国、美国、欧洲的 AI 监管政策” -> 可以按地区拆成 3 个子 Agent

## 并行限制

- 每一轮最多同时启动 {maxConcurrentResearchUnits} 个子 Agent。
- 最多进行 {maxResearcherIterations} 轮研究委托。
- 信息已经足够时，立即进入综合阶段，不要为了搜索而搜索。

## 重要原则

- 优先少量高质量研究，不追求搜索数量。
- 不要把一个简单问题过度拆碎。
- 不要让多个子 Agent 搜索完全相同的问题。
`;

function createModel() {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("缺少模型 API Key。请设置 OPENAI_API_KEY 或 DEEPSEEK_API_KEY。");
  }

  const baseURL =
    process.env.OPENAI_BASE_URL ??
    (process.env.DEEPSEEK_API_KEY ? "https://api.deepseek.com" : undefined);

  return new ChatOpenAI({
    apiKey,
    model: process.env.MODEL_NAME ?? "deepseek-chat",
    temperature: 0,
    ...(baseURL
      ? {
        configuration: {
          baseURL,
        },
      }
      : {}),
  });
}

function messageContentToString(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: unknown }).text ?? "");
        }

        return JSON.stringify(item);
      })
      .join("");
  }

  if (content == null) {
    return "";
  }

  return JSON.stringify(content, null, 2);
}

async function main() {
  assertRequiredEnv();

  const maxConcurrentResearchUnits = 2;
  const maxResearcherIterations = 2;
  const currentDate = new Date().toISOString().slice(0, 10);

  const instructions = [
    RESEARCH_WORKFLOW_INSTRUCTIONS,
    "=".repeat(80),
    SUBAGENT_DELEGATION_INSTRUCTIONS.replace(
      "{maxConcurrentResearchUnits}",
      String(maxConcurrentResearchUnits),
    ).replace(
      "{maxResearcherIterations}",
      String(maxResearcherIterations),
    ),
  ].join("\n\n");

  const researchSubAgent = {
    name: "research-agent",
    description:
      "适合执行独立的网页检索、资料阅读、事实整理和来源归纳。每次只交给它一个清晰研究主题。",
    systemPrompt: RESEARCHER_INSTRUCTIONS.replace("{date}", currentDate),
    tools: [tavilySearch],
  };

  const model = createModel();

  const agent = createDeepAgent({
    model,
    tools: [tavilySearch],
    systemPrompt: instructions,
    subagents: [researchSubAgent],

    // 让 Agent 的 write_file/read_file 操作真实写入当前项目目录
    // 添加这段代码能将Agent执行过程中的文件操作过程记录
    backend: new FilesystemBackend({
      rootDir: process.cwd(),
      virtualMode: true,
    }),
  });

  const question =
    process.argv.slice(2).join(" ").trim() ||
    // "请研究 RAG 和微调在 LLM 应用中的主要区别，并说明分别适合什么场景。";
    "天津和杭州的电费多少钱？"

  console.log("\n研究问题：");
  console.log(question);
  console.log("\nAgent 正在研究，请等待...\n");

  const result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: question,
        },
      ],
    },
    {
      recursionLimit: 80,
    },
  );

  const messages = result.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  console.log("\n================ 最终结果 ================\n");
  console.log(messageContentToString(lastMessage?.content));
}

main().catch((error) => {
  console.error("\n运行失败：");
  console.error(error);
  process.exitCode = 1;
});