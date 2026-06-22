import path from "node:path";
import { fileURLToPath } from "node:url";

// 当前文件路径：langgraph-agent/src/paths.ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录：langgraph-agent/
export const PROJECT_ROOT = path.resolve(__dirname, "..");