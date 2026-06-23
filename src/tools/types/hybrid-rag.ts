import * as z from "zod";
import type { Document } from "@langchain/core/documents";

export const AnswerCheckSchema = z.object({
  isGrounded: z
    .boolean()
    .describe("答案是否完全由检索上下文支持。"),

  isComplete: z
    .boolean()
    .describe("答案是否完整回应了用户问题。"),

  problems: z
    .array(z.string())
    .describe("列出答案中存在的问题，例如编造、缺少依据、回答不完整等。"),

  revisedAnswer: z
    .string()
    .describe("如果答案有问题，请给出一个只基于上下文的修正版答案。"),
});


export const RetrievalCheckSchema = z.object({
  isRelevant: z
    .boolean()
    .describe("检索到的上下文是否和用户问题相关。"),

  isSufficient: z
    .boolean()
    .describe("检索到的上下文是否足够回答用户问题。"),

  missingInfo: z
    .string()
    .describe("如果上下文不足，说明缺少哪些信息。"),

  suggestedQuery: z
    .string()
    .describe("如果检索结果不足，给出一个更适合重新检索的搜索语句。"),
});

export type RetrievalCheck = z.infer<typeof RetrievalCheckSchema>;

export type AnswerCheck = z.infer<typeof AnswerCheckSchema>;

export  type ScoredDoc = {
  doc: Document;
  score?: number;
};

export type HybridRagResult = {
  answer: string;
  sources: Array<{
    index: number;
    source: unknown;
    score?: number;
    preview: string;
  }>;
  debug: {
    originalQuestion: string;
    rewrittenQuestion: string;
    searchQueries: string[];
    retrievalCheck: RetrievalCheck;
    answerCheck: AnswerCheck;
  };
};