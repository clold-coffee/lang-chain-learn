import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT } from "../paths.ts";

// 一个 1x1 的占位 PNG，用于先跑通流程。
// 后续你可以把这里替换成 Gemini / OpenAI 图片生成接口。
const PLACEHOLDER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

async function writePlaceholderImage(imagePath: string) {
  await fs.mkdir(path.dirname(imagePath), { recursive: true });
  await fs.writeFile(imagePath, Buffer.from(PLACEHOLDER_PNG_BASE64, "base64"));
}

async function writePrompt(promptPath: string, prompt: string) {
  await fs.mkdir(path.dirname(promptPath), { recursive: true });
  await fs.writeFile(
    promptPath,
    `# 图片生成提示词\n\n${prompt}\n`,
    "utf-8"
  );
}

export const generateCoverTool = tool(
  async ({ prompt, slug }: { prompt: string; slug: string }) => {
    const imagePath = path.join(PROJECT_ROOT, "blogs", slug, "hero.png");
    const promptPath = path.join(PROJECT_ROOT, "blogs", slug, "hero_prompt.md");

    await writePlaceholderImage(imagePath);
    await writePrompt(promptPath, prompt);

    return {
      success: true,
      message: "博客封面占位图已生成。当前是 mock 版本，后续可替换为真实图片生成模型。",
      imagePath: `blogs/${slug}/hero.png`,
      promptPath: `blogs/${slug}/hero_prompt.md`
    };
  },
  {
    name: "generate_cover",
    description: "为博客文章生成封面图，并保存到 blogs/<slug>/hero.png。",
    schema: z.object({
      prompt: z.string().describe("中文图片提示词，描述封面图的主体、风格、构图和情绪。"),
      slug: z.string().describe("博客 slug，图片会保存到 blogs/<slug>/hero.png。")
    })
  }
);

export const generateSocialImageTool = tool(
  async ({
    prompt,
    platform,
    slug
  }: {
    prompt: string;
    platform: "linkedin" | "tweets";
    slug: string;
  }) => {
    const imagePath = path.join(PROJECT_ROOT, platform, slug, "image.png");
    const promptPath = path.join(PROJECT_ROOT, platform, slug, "image_prompt.md");

    await writePlaceholderImage(imagePath);
    await writePrompt(promptPath, prompt);

    return {
      success: true,
      message: "社交媒体占位图已生成。当前是 mock 版本，后续可替换为真实图片生成模型。",
      imagePath: `${platform}/${slug}/image.png`,
      promptPath: `${platform}/${slug}/image_prompt.md`
    };
  },
  {
    name: "generate_social_image",
    description: "为 LinkedIn 或 X/Twitter 内容生成配图，并保存到对应目录。",
    schema: z.object({
      prompt: z.string().describe("中文图片提示词，描述配图主体、构图、风格和情绪。"),
      platform: z.enum(["linkedin", "tweets"]).describe("保存平台，只能是 linkedin 或 tweets。"),
      slug: z.string().describe("内容 slug，图片会保存到 <platform>/<slug>/image.png。")
    })
  }
);