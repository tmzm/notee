import { RedisChatMessageHistory } from "@langchain/redis";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import fs from "fs";
import path from "path";
import type { Core } from "@strapi/strapi";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";

export function getChatHistory(chatId: number) {
  return new RedisChatMessageHistory({
    sessionId: `chat:${chatId}`,
    sessionTTL: 60 * 60 * 24 * 7,
    config: {
      url: process.env.REDIS_URL!,
    },
  });
}

export function getModel(streaming = false) {
  return new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    streaming,
    openAIApiKey: process.env.OPENAI_API_KEY!,
    configuration: {
      baseURL: process.env.OPENAI_API_URL || "https://openrouter.ai/api/v1",
    },
  });
}

export const chatPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful AI assistant.
Use the provided sources if relevant.
If the answer is not in the sources, say so clearly.`,
  ],
  ["system", "{sources}"],
  ["human", "{history}\n{input}"],
]);

export function buildSourcesContext(
  strapi: Core.Strapi,
  sources: any[],
): string {
  if (!sources?.length) return "";

  const baseDir =
    strapi.dirs?.static?.public ?? path.join(process.cwd(), "public");

  const chunks: string[] = [];

  for (const file of sources) {
    if (!file?.url) continue;

    try {
      const filePath = path.join(baseDir, file.url.replace(/^\//, ""));
      const ext = path.extname(filePath).toLowerCase();

      if (![".txt", ".md"].includes(ext)) continue;

      const content = fs.readFileSync(filePath, "utf-8");
      chunks.push(`### ${file.name}\n${content}`);
    } catch {
      chunks.push(`### ${file.name}\n[Unreadable file]`);
    }
  }

  return chunks.length ? `SOURCES:\n\n${chunks.join("\n\n")}` : "";
}

export function createConversationRunnable() {
  return new RunnableWithMessageHistory({
    runnable: chatPrompt.pipe(getModel(true)),
    getMessageHistory: getChatHistory,
    inputMessagesKey: "input",
    historyMessagesKey: "history",
  });
}

export async function sendMessage(
  strapi: Core.Strapi,
  chatId: number,
  input: string,
  sources: any[],
) {
  const runnable = createConversationRunnable();

  const result = await runnable.invoke(
    {
      input,
      sources: buildSourcesContext(strapi, sources),
      history: "",
    },
    {
      configurable: { sessionId: chatId },
    },
  );

  return result.content;
}

export async function* sendMessageStream(
  strapi: Core.Strapi,
  chatId: number,
  input: string,
  sources: any[],
) {
  const runnable = createConversationRunnable();

  const stream = runnable.streamEvents(
    {
      input,
      sources: buildSourcesContext(strapi, sources),
    },
    {
      configurable: { sessionId: chatId },
      version: "v1",
    },
  );

  yield { started: true };

  for await (const event of stream) {
    if (event.event === "on_llm_stream") {
      const chunk = event.data.chunk?.text;
      if (chunk) yield { content: chunk };
    }
  }

  yield { done: true };
}

export async function getConversation(
  chatId: number,
): Promise<{ role: string; content: string }[]> {
  const history = getChatHistory(chatId);
  const messages = await history.getMessages();
  return messages.map((m) => ({
    role:
      m._getType() === "human"
        ? "user"
        : m._getType() === "ai"
          ? "assistant"
          : "system",
    content: typeof m.content === "string" ? m.content : String(m.content),
  }));
}
