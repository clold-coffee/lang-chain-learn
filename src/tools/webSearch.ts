import { tool } from "@langchain/core/tools";
import { z } from "zod";
import "dotenv/config";

type WebSearchInput = {
  query: string;
  maxResults?: number;
  topic?: "general" | "news";
};

export const webSearchTool = tool(
  async ({ query, maxResults = 5, topic = "general" }: WebSearchInput) => {
    const apiKey = process.env.TAVILY_API_KEY;

    // 为了让你本地先跑通：没有 Tavily Key 时，返回模拟调研结果
    if (!apiKey) {
      return {
        mode: "mock",
        message: "未配置 TAVILY_API_KEY，当前返回模拟搜索结果，方便先跑通 Deep Agents 流程。",
        query,
        topic,
        results: [
          {
            title: `关于「${query}」的概念说明`,
            url: "local://mock/concept",
            content: `「${query}」通常涉及概念理解、工程实践、适用场景和常见问题。写作时应先解释它解决什么问题，再解释如何落地。`
          },
          {
            title: `关于「${query}」的实践建议`,
            url: "local://mock/practice",
            content: `建议从最小可运行示例开始：先定义 Agent，再加入工具，再加入文件系统，最后扩展到前端交互。`
          },
          {
            title: `关于「${query}」的常见误区`,
            url: "local://mock/pitfall",
            content: `常见误区是直接追求复杂架构，而没有先跑通最小链路。学习时应优先验证输入、工具调用、文件输出和最终响应。`
          }
        ].slice(0, maxResults)
      };
    }

    try {
      const { TavilyClient } = await import("tavily");
      const client = new TavilyClient({ apiKey });

      return await client.search(query, {
        maxResults,
        topic
      });
    } catch (error) {
      return {
        error: `搜索失败：${error instanceof Error ? error.message : String(error)}`
      };
    }
  },
  {
    name: "web_search",
    description: "搜索当前信息，用于 researcher 子 Agent 做内容调研。",
    schema: z.object({
      query: z.string().describe("搜索关键词，需要具体明确。"),
      maxResults: z.number().optional().describe("返回结果数量，默认 5。"),
      topic: z.enum(["general", "news"]).optional().describe("general 表示普通搜索，news 表示新闻搜索。")
    })
  }
);