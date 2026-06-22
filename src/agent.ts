import "dotenv/config";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { PROJECT_ROOT } from "./paths";
import { webSearchTool } from "./tools/webSearch";
import { generateCoverTool, generateSocialImageTool } from "./tools/imageTools";

const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

if (!deepseekApiKey) {
  throw new Error("缺少 DEEPSEEK_API_KEY，请先在 .env 中配置。");
}

// 使用你之前项目里已经习惯的 DeepSeek OpenAI-compatible 写法
const model = new ChatOpenAI({
  model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
  apiKey: deepseekApiKey,
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"
  },
  temperature: 0.3
});

const researcherSubagent = {
  name: "researcher",
  description:
    "专门负责内容调研的子 Agent。适合搜索资料、整理概念、提炼观点、总结案例和风险点。",
  systemPrompt: `
你是一个中文技术内容调研员。

你的任务：
1. 根据主 Agent 给你的主题进行调研。
2. 优先使用 web_search 工具。
3. 返回结构化调研结果。
4. 不要写最终文章，只返回调研材料。

输出格式：

# 调研主题

## 1. 核心概念

## 2. 为什么重要

## 3. 适用场景

## 4. 实践步骤

## 5. 常见问题

## 6. 可用于写作的关键观点

请使用中文回答。
`,
  tools: [webSearchTool]
};

export const agent = createDeepAgent({
  model,

  // 加载项目根目录下的长期规则
  memory: ["./AGENTS.md"],

  // 加载 skills 目录，Agent 会根据用户任务选择 blog-post 或 social-media
  skills: ["./skills/"],

  // 主 Agent 可用工具：生成博客封面、生成社媒配图
  tools: [generateCoverTool, generateSocialImageTool],

  // 子 Agent：专门做调研
  subagents: [researcherSubagent],

  // 文件系统根目录限制在当前 LangGraph 项目下
  backend: new FilesystemBackend({
    rootDir: PROJECT_ROOT
  })
});