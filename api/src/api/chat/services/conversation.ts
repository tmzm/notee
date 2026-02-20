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
import { TavilySearch } from "@langchain/tavily";

const getRedisConfig = () => {
  switch (process.env.REDIS_TYPE) {
    case "url":
      return {
        url: process.env.REDIS_URL!,
      };
    case "socket":
      return {
        username: process.env.REDIS_USERNAME!,
        password: process.env.REDIS_PASSWORD!,
        socket: {
          host: process.env.REDIS_HOST!,
          port: parseInt(process.env.REDIS_PORT!),
        },
      };
    default:
      throw new Error("REDIS_TYPE is not set. Must be 'url' or 'socket'");
  }
};

export function getChatHistory(chatId: number) {
  return new RedisChatMessageHistory({
    sessionId: `chat:${chatId}`,
    sessionTTL: 60 * 60 * 24 * 7,
    config: {
      ...getRedisConfig(),
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
     This is a chatbot named Notee that answers questions using PDFs or web search.
     Creator of the chatbot is a student of Damascus University ITE (in Arabic: جامعة دمشق قسم هندسة البرمجيات) with name Tareq AL-Mozayek (in Arabic: طارق المزيك) from Syria Damascus (in Arabic: سوريا دمشق).
     The chatbot is built using LangChain and OpenAI.
    `,
  ],
  new MessagesPlaceholder("history"),
  // [
  //   "system",
  //   `This is a chatbot named {chatName}.
  //    User information: name {userInfo.name} email: {userInfo.email}.
  //   `,
  // ],
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

export async function createRetrievalTool(chatId: number, sources: any[]) {
  const client = createClient(getRedisConfig());
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

  // 1. Sync Redis index with current sources (handle adding/removing sources)
  // We'll keep a list of source URLs associated with each chatId in Redis.
  // If sources have changed (added or removed), we clear the vector index and reload.
  const sourcesKey = `chatSources:${chatId}:urls`;

  // Fetch URLs already processed (if any)
  let storedSourceUrls: string[] = [];
  const urlsString = await client.get(sourcesKey).catch(() => null);
  if (urlsString) {
    try {
      storedSourceUrls = JSON.parse(urlsString);
    } catch (e) {
      storedSourceUrls = [];
    }
  }
  // Current source urls as array
  const currentSourceUrls = sources
    .filter((s) => s.url)
    .map((s) => s.url)
    .sort();
  storedSourceUrls.sort();

  // Check if sources have changed (added/removed)
  const sourcesChanged =
    storedSourceUrls.length !== currentSourceUrls.length ||
    !storedSourceUrls.every((url, idx) => url === currentSourceUrls[idx]);

  // Check if index is empty (possibly new chat)
  const existingDocs = await client.ft
    .info(`chatSources:${chatId}`)
    .catch(() => null);

  // If sources changed or index missing, clear & reload
  if (!existingDocs || sourcesChanged) {
    // If index exists and sources changed, clear it (delete all docs)
    if (existingDocs && sourcesChanged) {
      // Remove all previous vectors to avoid duplicates/stale docs
      await client.del(`vectorstore:chatSources:${chatId}`);
    }

    const docs = [];
    for (const source of sources) {
      if (!source.url) continue;

      const response = await fetch(source.url);
      const blob = await response.blob();

      try {
        const loaded = await new PDFLoader(blob).load();
        docs.push(...loaded);
      } catch (e) {
        console.error("Error loading PDF", e);
      }
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

    // Store the current set of source URLs in Redis for this chat
    await client.set(sourcesKey, JSON.stringify(currentSourceUrls));
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
  chatName: string,
  userInfo: {
    name: string;
    email: string;
  },
  input: string,
  sources: any[],
) {
  const runnable = await createConversationRunnable(chatId, sources);

  const stream = runnable.streamEvents(
    { input, chatName, userInfo },
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
