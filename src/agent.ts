import "dotenv/config";

import { ChatDeepSeek } from "@langchain/deepseek";
import { loadSource } from "./tools/RAG/loadSourceDocumen.js";
import { splitter } from "./tools/RAG/embedding.js";
import { vectorStore } from "./tools/RAG/vectorStore.js";
import { askHybridRag } from "./tools/RAG/hybrid-rag.js";
import { getFilePath } from "./tools/getFilePath.js";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量：${name}`);
  }
  return value;
}



// 加载知识库资料内容
const pageDocs = await loadSource({
  type: "pdf",
  // 获取文件的相对路径
  value: getFilePath( import.meta.url, "../data/ABF膜_A股上市公司调研报告.pdf"),
});


// 切分成多个chunk
const chunks = await splitter.splitDocuments(pageDocs);

// 建立向量化索引
await vectorStore.addDocuments(chunks);


// 使用大模型
const model = new ChatDeepSeek({
  apiKey: getEnv("DEEPSEEK_API_KEY"),
  model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
  temperature: 0,
});


const result = await askHybridRag(
  model,
  vectorStore,
  "哪家公司生成ABF膜？",
 
);

console.log("答案：");
console.log(result.answer);

console.log("\n来源：");
console.log(result.sources);

console.log("\n调试信息：");
console.log(JSON.stringify(result.debug, null, 2));

