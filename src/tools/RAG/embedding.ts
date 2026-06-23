

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";




// 实例化 Splitter对象，设置切割文本内容的规则
export const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});


/**
 * 调用方式
 * 
  // 切分成多个chunk
  const chunks = await splitter.splitDocuments(pageDocs);

  // 建立向量化索引
  await vectorStore.addDocuments(chunks);
 * 
 */

