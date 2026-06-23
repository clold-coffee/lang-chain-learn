import "dotenv/config";

import { Document } from "@langchain/core/documents";
import { tool } from "@langchain/core/tools";
import { vectorStore } from "./vectorStore.js";


// 答案依据
function formatDocs(docs: Document[]): string {
  return docs
    .map((doc, index) => {
      return [
        `<doc id="${index + 1}">`,
        `source: ${doc.metadata.source}`,
        `page: ${doc.metadata.pageNumber}`,
        `content:`,
        doc.pageContent,
        `</doc>`,
      ].join("\n");
    })
    .join("\n\n");
}





// RAG检索工具
const retrieveTool = tool(
  async ({ query }) => {
    // 根据问题向量化检索
    const docs = await vectorStore.similaritySearch(query, 4);
    // 把向量化检索结果， 转换成文档形式
    const context = formatDocs(docs);

    return docs
      .map((doc, index) => {
        return `[${index + 1}] ${doc.pageContent}`;
      })
      .join("\n\n");
  },
  {
    name: "retrieve_knowledge",
    description: "Search the knowledge base for relevant information.",
    schema: z.object({
      query: z.string().describe("Search query"),
    }),
  }
);

