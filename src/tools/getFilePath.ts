
import { fileURLToPath } from "node:url";
import path from "node:path";


export const getFilePath = (url:string,filePath: string) => {
const __filename = fileURLToPath(url);
const __dirname = path.dirname(__filename);

  return path.resolve(
    __dirname,
    filePath
  );
}