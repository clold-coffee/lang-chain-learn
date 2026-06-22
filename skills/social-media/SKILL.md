---
name: social-media
description: 当用户要求写 LinkedIn、X、Twitter、社交媒体帖子、短内容、帖子改写、内容分发时使用这个 skill。
---
# 社交媒体内容 Skill

## 使用场景

当用户要求写：

- LinkedIn 帖子
- X / Twitter thread
- 社交媒体文案
- 内容分发帖
- 从博客改写成短帖

请使用本 skill。

## 必须先调研

写社交媒体内容前，必须先调用 `researcher` 子 Agent。

调用方式：

```txt
task(
  subagent_type="researcher",
  description="调研 [主题]，整理适合社交媒体表达的观点、案例、冲突点和传播角度。请返回结构化调研结果。"
)
```


调研完成后：

1. 把调研结果保存到 `research/<slug>.md`
2. 再开始写社媒正文

## LinkedIn 输出路径

如果用户要求 LinkedIn 内容，保存到：

<pre class="overflow-visible! px-0!" data-start="4882" data-end="4935"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>linkedin/<slug>/</span><br/><span>├── post.md</span><br/><span>└── image.png</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

同时保存图片提示词：

<pre class="overflow-visible! px-0!" data-start="4949" data-end="4991"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>linkedin/<slug>/image_prompt.md</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

## X / Twitter 输出路径

如果用户要求 X / Twitter thread，保存到：

<pre class="overflow-visible! px-0!" data-start="5046" data-end="5099"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>tweets/<slug>/</span><br/><span>├── thread.md</span><br/><span>└── image.png</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

同时保存图片提示词：

<pre class="overflow-visible! px-0!" data-start="5113" data-end="5153"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>tweets/<slug>/image_prompt.md</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

## LinkedIn 写作格式

<pre class="overflow-visible! px-0!" data-start="5173" data-end="5307"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="relative h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class=""><div class="relative"><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span># LinkedIn Post</span><br/><br/><span>第一行：强 hook，直接制造兴趣。</span><br/><br/><span>正文：</span><br/><span>- 2 到 4 个短段落</span><br/><span>- 每段只讲一个观点</span><br/><span>- 尽量结合学习者或开发者场景</span><br/><span>- 结尾提出问题或行动建议</span><br/><br/><span>#LangChain #LangGraph #AI工程化</span></code></pre></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></div></div></pre>

## X / Twitter Thread 格式

<pre class="overflow-visible! px-0!" data-start="5335" data-end="5418"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="relative h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class=""><div class="relative"><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>1/ 第一条必须是 hook。</span><br/><br/><span>2/ 第二条解释背景。</span><br/><br/><span>3/ 第三条给出核心观点。</span><br/><br/><span>4/ 第四条给出例子。</span><br/><br/><span>5/ 第五条总结并给行动建议。</span></code></pre></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></div></div></pre>

## 图片要求

必须调用 `generate_social_image` 工具。

参数：

* `platform`: `linkedin` 或 `tweets`
* `slug`: 当前内容 slug
* `prompt`: 中文图片提示词

## 完成标准

* [ ]  已调用 researcher
* [ ]  已保存 `research/<slug>.md`
* [ ]  已保存社媒正文
* [ ]  已调用 `generate_social_image`
* [ ]  已生成图片文件
* [ ]  内容是中文
