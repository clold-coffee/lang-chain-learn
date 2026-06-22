import { agent } from "./agent";

const task =
  process.argv.slice(2).join(" ") ||
  "写一篇关于 Deep Agents content builder 的中文技术博客，要求适合 LangChain 初学者阅读。";

console.log("\n========== 用户任务 ==========\n");
console.log(task);

console.log("\n========== Agent 开始执行 ==========\n");

const threadId = `content-builder-${Date.now()}`;

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: task
      }
    ]
  },
  {
    configurable: {
      threadId,
      thread_id: threadId
    }
  }
);

console.log("\n========== Agent 最终消息 ==========\n");

const messages = result.messages ?? [];

for (const message of messages) {
  const content = message.content;

  if (!content) continue;

  if (typeof content === "string") {
    console.log(content);
  } else {
    console.log(JSON.stringify(content, null, 2));
  }

  console.log("\n---\n");
}

console.log("\n========== 检查生成目录 ==========\n");
console.log("请查看项目根目录下的 research/、blogs/、linkedin/ 或 tweets/。");