import "dotenv/config";
import mysql, { RowDataPacket } from "mysql2/promise";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量：${name}`);
  }
  return value;
}

const MYSQL_DATABASE = requiredEnv("MYSQL_DATABASE");

const allowedTables = (process.env.MYSQL_ALLOWED_TABLES ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);



const pool = mysql.createPool({
  host: requiredEnv("MYSQL_HOST"),
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: requiredEnv("MYSQL_USER"),
  password: requiredEnv("MYSQL_PASSWORD"),
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: false,
});

/**
 * 获取当前数据库的表结构。
 * 这里不是让模型自己去猜表结构，而是我们提前把 schema 提供给模型。
 */
async function getSchemaText(): Promise<string> {
  const tableFilterSql =
    allowedTables.length > 0
      ? `AND TABLE_NAME IN (${allowedTables.map(() => "?").join(",")})`
      : "";

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT 
      TABLE_NAME,
      COLUMN_NAME,
      DATA_TYPE,
      IS_NULLABLE,
      COLUMN_KEY,
      COLUMN_COMMENT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
    ${tableFilterSql}
    ORDER BY TABLE_NAME, ORDINAL_POSITION
    `,
    [MYSQL_DATABASE, ...allowedTables]
  );

  const tables = new Map<string, string[]>();

  for (const row of rows) {
    const tableName = row.TABLE_NAME as string;
    const columnName = row.COLUMN_NAME as string;
    const dataType = row.DATA_TYPE as string;
    const nullable = row.IS_NULLABLE as string;
    const columnKey = row.COLUMN_KEY as string;
    const comment = row.COLUMN_COMMENT as string;

    if (!tables.has(tableName)) {
      tables.set(tableName, []);
    }

    const keyText = columnKey ? `，键：${columnKey}` : "";
    const nullableText = nullable === "YES" ? "可为空" : "不可为空";
    const commentText = comment ? `，备注：${comment}` : "";

    tables
      .get(tableName)!
      .push(`- ${columnName}：${dataType}，${nullableText}${keyText}${commentText}`);
  }

  if (tables.size === 0) {
    throw new Error("没有读取到任何表结构，请检查数据库名、用户权限或 MYSQL_ALLOWED_TABLES 配置。");
  }

  return Array.from(tables.entries())
    .map(([tableName, columns]) => {
      return `表名：${tableName}\n字段：\n${columns.join("\n")}`;
    })
    .join("\n\n");
}

/**
 * 去掉 SQL 注释，降低注入和绕过检查的风险。
 * 注意：这是学习版防护，不等于生产级 SQL 防火墙。
 */
function removeSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n\r]*/g, " ")
    .replace(/#[^\n\r]*/g, " ");
}

/**
 * 对模型生成的 SQL 做基本安全检查。
 * 目标：
 * 1. 只允许 SELECT
 * 2. 禁止写入、删除、建表、删表、授权等操作
 * 3. 禁止多语句
 * 4. 自动追加 LIMIT，避免一次返回太多数据
 */
function sanitizeSqlQuery(inputSql: string): string {
  const cleaned = removeSqlComments(inputSql)
    .trim()
    .replace(/;+\s*$/, "");

  if (!cleaned) {
    throw new Error("SQL 不能为空。");
  }

  if (cleaned.includes(";")) {
    throw new Error("禁止执行多条 SQL 语句。");
  }

  const normalized = cleaned.replace(/\s+/g, " ").trim();

  if (!/^select\b/i.test(normalized)) {
    throw new Error("只允许执行 SELECT 查询。");
  }

  const forbiddenPattern =
    /\b(insert|update|delete|replace|alter|drop|create|truncate|grant|revoke|call|execute|prepare|deallocate|set|use|show|describe|desc|load|outfile|dumpfile|lock|unlock)\b/i;

  if (forbiddenPattern.test(normalized)) {
    throw new Error("SQL 中包含禁止使用的关键字。");
  }

  if (/\binto\s+(out|dump)file\b/i.test(normalized)) {
    throw new Error("禁止导出文件。");
  }

  if (/\bload_file\s*\(/i.test(normalized)) {
    throw new Error("禁止读取服务器文件。");
  }

  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 20;

  const limitMatch = normalized.match(/\blimit\s+(\d+)/i);

  if (limitMatch) {
    const currentLimit = Number(limitMatch[1]);

    if (Number.isFinite(currentLimit) && currentLimit > MAX_LIMIT) {
      return normalized.replace(/\blimit\s+\d+/i, `LIMIT ${MAX_LIMIT}`);
    }

    return normalized;
  }

  return `${normalized} LIMIT ${DEFAULT_LIMIT}`;
}

async function runQuery(sql: string): Promise<unknown[]> {
  const safeSql = sanitizeSqlQuery(sql);
  const [rows] = await pool.query<RowDataPacket[]>(safeSql);
  return rows;
}

async function main() {
  const schemaText = await getSchemaText();

  const model = new ChatOpenAI({
    apiKey: requiredEnv("DEEPSEEK_API_KEY"),
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
    temperature: 0.1,
    streamUsage: false,
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    },
  });

  const executeSqlTool = tool(
    async ({ query }) => {
      const rows = await runQuery(query);
      return JSON.stringify(rows, null, 2);
    },
    {
      name: "execute_sql",
      description:
        "执行一条只读 MySQL SELECT 查询，并返回 JSON 格式的查询结果。只能用于数据分析和查询，不能修改数据库。",
      schema: z.object({
        query: z
          .string()
          .describe("只读 MySQL SELECT 查询语句。禁止 INSERT、UPDATE、DELETE、DROP、ALTER 等操作。"),
      }),
    }
  );

  const systemPrompt = `
你是一个谨慎、可靠的 MySQL 数据分析助手。

你的任务：
1. 根据用户的问题，分析应该查询哪些表和字段。
2. 只能基于下面提供的真实数据库结构生成 SQL。
3. 不要编造表名、字段名、业务含义。
4. 需要查询数据库时，必须调用 execute_sql 工具。
5. 只能生成 SELECT 查询。
6. 禁止生成 INSERT、UPDATE、DELETE、DROP、ALTER、CREATE、TRUNCATE、GRANT、REVOKE 等修改性 SQL。
7. 不要使用 SELECT *，除非用户明确要求查看完整字段。
8. 查询结果默认只需要少量样本或聚合结果。
9. 如果 SQL 执行失败，你需要根据错误信息修正 SQL 后再试。
10. 最终回答必须使用中文，并且要解释你查询了什么、得出了什么结论。
11. 如果数据库结构中没有足够信息回答问题，要直接说明缺少哪些字段或表，不要猜测。

当前数据库结构如下：

${schemaText}
`;

  const agent = createAgent({
    model,
    tools: [executeSqlTool],
    systemPrompt,
  });

  const question =
    process.argv.slice(2).join(" ") ||
    "请帮我查看这个数据库里有哪些适合做统计分析的数据，并给出建议。";

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: question,
      },
    ],
  });

  const lastMessage = result.messages[result.messages.length - 1];

  console.log("\n=== Agent 回答 ===\n");
  console.log(lastMessage.content);

  await pool.end();
}

main().catch(async (error) => {
  console.error("\n运行失败：");
  if (error?.code === "ER_ACCESS_DENIED_ERROR") {
    console.error(
      [
        "MySQL 拒绝登录。请重点检查以下配置：",
        `- MySQL 实际匹配的账号是：${process.env.MYSQL_USER}@连接来源 IP`,
        "- 同一个用户名在 MySQL 中不同 host 记录的密码可以不同。",
        "- 如果来源 IP 是 192.168.65.1，需要重置 readonly_agent@192.168.65.1 的密码，并授予目标库 SELECT 权限。",
        "- 如果密码包含 #、空格等特殊字符，.env 中必须用引号包起来。",
      ].join("\n")
    );
  }
  console.error(error);

  try {
    await pool.end();
  } catch {
    // 忽略关闭连接池错误
  }

  process.exit(1);
});
