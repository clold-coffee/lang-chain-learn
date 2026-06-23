
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/ollama";


// 使用ollama 的embedding能力
const embeddings = new OllamaEmbeddings({
  model: process.env.OLLAMA_EMBEDDING_MODEL ?? "bge-m3",
  baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
});

// 向量化存储--存在内存中
export const vectorStore = new MemoryVectorStore(embeddings);