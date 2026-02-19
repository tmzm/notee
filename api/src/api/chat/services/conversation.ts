import { RedisChatMessageHistory, RedisVectorStore } from "@langchain/redis";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createClient } from "redis";
import { createRetrieverTool } from "@langchain/classic/tools/retriever";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {
  createOpenAIToolsAgent,
  AgentExecutor,
} from "@langchain/classic/agents";
import path from "path";
import { TavilySearch } from "@langchain/tavily";

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
    temperature: 0, // Tools work best at 0
    streaming,
    openAIApiKey: process.env.OPENAI_API_KEY!,
    configuration: {
      baseURL: process.env.OPENAI_API_URL || "https://openrouter.ai/api/v1",
    },
  });
}

const chatPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an assistant that answers questions using PDFs or web search.

    CRITICAL: When using the search tool, provide ONLY a plain text string as the input. 
    Do NOT provide a JSON object or multiple arguments.
    Example: "current weather in London"
    `,
  ],
  new MessagesPlaceholder("history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

export async function createRetrievalTool(chatId: number, sources: any[]) {
  const client = createClient({ url: process.env.REDIS_URL! });
  await client.connect();

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_API_KEY!,
    configuration: {
      baseURL: process.env.OPENAI_API_URL || "https://openrouter.ai/api/v1",
    },
  });

  const vectorStore = new RedisVectorStore(embeddings, {
    redisClient: client as any,
    indexName: `chatSources:${chatId}`,
  });

  // 1. Check if we actually need to add documents
  // Use a simple flag or check if the index is empty to avoid redundant processing
  const existingDocs = await client.ft
    .info(`chatSources:${chatId}`)
    .catch(() => null);

  if (!existingDocs || sources.length > 0) {
    const docs = [];
    for (const source of sources) {
      if (!source.url) continue;
      const filePath = path.join(process.cwd(), "public", source.url);
      const loaded = await new PDFLoader(filePath).load();
      docs.push(...loaded);
    }

    if (docs.length > 0) {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });
      const chunks = await splitter.splitDocuments(docs);
      // Ensure this completes BEFORE returning the tool
      console.log("chunks", chunks);
      await vectorStore.addDocuments(chunks);
    }
  }

  // 2. Return the retriever
  const retriever = vectorStore.asRetriever({ k: 5 }); // Increase k to give the model more context

  return createRetrieverTool(retriever, {
    name: "retrieve_documents",
    description:
      "Queries the knowledge base of uploaded PDFs. Input should be a simple search string.",
  });
}

export async function createConversationRunnable(
  chatId: number,
  sources: any[],
) {
  // Your existing PDF tool
  const retrievalTool = await createRetrievalTool(chatId, sources);

  // The Web Search tool (requires TAVILY_API_KEY in .env)
  const searchTool = new TavilySearch({
    maxResults: 3,
  });

  const tools = [retrievalTool, searchTool];
  const model = getModel(true);

  // Use the AgentExecutor pattern mentioned before
  const agent = await createOpenAIToolsAgent({
    llm: model,
    tools,
    prompt: chatPrompt,
  });

  const executor = new AgentExecutor({
    agent,
    tools,
    // This helps handle the 400 error if the model produces a bad tool call
    handleParsingErrors: true,
    maxIterations: 3,
  });

  return new RunnableWithMessageHistory({
    runnable: executor,
    getMessageHistory: () => getChatHistory(chatId),
    inputMessagesKey: "input",
    historyMessagesKey: "history",
  });
}

export async function* sendMessageStream(
  chatId: number,
  input: string,
  sources: any[],
) {
  const runnable = await createConversationRunnable(chatId, sources);

  const stream = runnable.streamEvents(
    { input },
    {
      configurable: { sessionId: chatId },
      version: "v1",
    },
  );

  yield { started: true };

  for await (const event of stream) {
    // console.log("event", event);
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
