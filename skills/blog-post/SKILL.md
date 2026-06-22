---
name: blog-post
description: 当用户要求写博客、技术文章、长文、公众号草稿、教程文章时使用这个 skill。
---
# 博客写作 Skill

## 使用场景

当用户要求你写：

- 技术博客
- 公众号文章
- 教程长文
- 深度解析
- 学习笔记整理

请使用本 skill。

## 必须先调研

在正式写博客前，必须先调用 `researcher` 子 Agent。

调用方式：

```txt
task(
  subagent_type="researcher",
  description="调研 [主题]，整理关键概念、适用场景、实现步骤和常见问题。请返回结构化调研结果。"
)
```


调研完成后：

1. 你需要把调研结果保存到 `research/<slug>.md`
2. 如果 researcher 已经保存，则你仍然要检查该文件是否存在
3. 如果没有保存，你必须自己把 researcher 返回的结果写入 `research/<slug>.md`

## 博客输出路径

每篇博客必须保存到：

<pre class="overflow-visible! px-0!" data-start="3639" data-end="3688"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>blogs/<slug>/</span><br/><span>├── post.md</span><br/><span>└── hero.png</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

同时还要保存图片提示词：

<pre class="overflow-visible! px-0!" data-start="3704" data-end="3742"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>blogs/<slug>/hero_prompt.md</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

## 博客结构

博客正文保存到 `blogs/<slug>/post.md`，结构如下：

<pre class="overflow-visible! px-0!" data-start="3791" data-end="4007"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="relative h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class=""><div class="relative"><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span># 标题</span><br/><br/><span>## 1. 这篇文章解决什么问题</span><br/><br/><span>用 2-3 段说明读者为什么需要读这篇文章。</span><br/><br/><span>## 2. 核心概念</span><br/><br/><span>解释关键概念，尽量用类比和例子。</span><br/><br/><span>## 3. 工作流程</span><br/><br/><span>用步骤说明这个技术怎么运行。</span><br/><br/><span>## 4. 代码实践思路</span><br/><br/><span>说明如果要落地，项目结构、核心文件、关键代码应该怎么设计。</span><br/><br/><span>## 5. 常见问题</span><br/><br/><span>列出学习者容易卡住的问题。</span><br/><br/><span>## 6. 总结</span><br/><br/><span>总结核心价值，并给出下一步实践建议。</span></code></pre></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></div></div></pre>

## 图片要求

必须调用 `generate_cover` 工具。

调用参数：

* `slug`: 当前文章的 slug
* `prompt`: 中文图片提示词，描述博客封面应该长什么样

图片工具会生成：

<pre class="overflow-visible! px-0!" data-start="4117" data-end="4177"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼd ͼr"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>blogs/<slug>/hero.png</span><br/><span>blogs/<slug>/hero_prompt.md</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

## 完成标准

完成前检查：

* [ ]  已调用 researcher
* [ ]  已保存 `research/<slug>.md`
* [ ]  已保存 `blogs/<slug>/post.md`
* [ ]  已调用 `generate_cover`
* [ ]  已生成 `blogs/<slug>/hero.png`
* [ ]  正文是中文
