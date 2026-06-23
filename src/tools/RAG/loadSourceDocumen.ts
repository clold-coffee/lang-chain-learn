import { PDFParse } from "pdf-parse";
import { readFileSync } from "node:fs";
import { Document } from "@langchain/core/documents";
import * as cheerio from "cheerio";

// 根据pdf地址加载文档
async function loadPdfPages(filePath: string): Promise<Document[]> {
  const parser = new PDFParse({
    data: new Uint8Array(readFileSync(filePath)),
  });

  try {
    const { pages } = await parser.getText();

    return pages.map(
      (page) =>
        new Document({
          pageContent: page.text,
          metadata: {
            source: filePath,
            pageNumber: page.num,
            pageIndex: page.num - 1,
          },
        })
    );
  } finally {
    await parser.destroy();
  }
}


/**
 * 清洗网页获取的文档内容
 * 根据URL地址加载文档
 * @param url 
 * @returns 
 */
async function loadCleanWebPage(url: string): Promise<Document[]> {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  // 1. 删除明显不需要的元素
  $("script, style, nav, footer, header, aside, noscript").remove();

  // 2. 优先选择正文区域
  const main =
    $("article").length > 0
      ? $("article")
      : $("main").length > 0
        ? $("main")
        : $("body");

  // 3. 按段落提取，保留段落分隔
  const paragraphs = main
    .find("h1, h2, h3, div,  span")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((text) => text.length > 0);

  // 4. 规整空白
  const pageContent = paragraphs
    .map((text) => text.replace(/\s+/g, " "))
    .join("\n\n");

  return [
    new Document({
      pageContent,
      metadata: { source: url },
    }),
  ];
}





// 加载知识库内容
export async function loadSource(source: {
  type: "pdf" | "url";
  value: string;
}) {
  if (source.type === "pdf") {
    // 加载 PDF
    return loadPdfPages(source.value)
  }

  if (source.type === "url") {
    // 加载 URL 网页
    return loadCleanWebPage(source.value)
  }

}