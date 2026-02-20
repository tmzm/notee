/**
 * chat controller
 */

import { factories } from "@strapi/strapi";
import { PassThrough } from "stream";
import { getConversation, sendMessageStream } from "../services/conversation";

async function requireUser(ctx: any) {
  const user = ctx.state.user;
  if (!user) ctx.throw(401, "Unauthorized");
  return user;
}

async function findUserChat(
  strapi: any,
  chatId: number,
  userId: number,
  populate: string[] = [],
) {
  const chats = await strapi.entityService.findMany("api::chat.chat", {
    filters: { id: chatId, user: userId },
    populate,
    limit: 1,
  });

  if (!chats.length) {
    throw new Error("CHAT_NOT_FOUND");
  }

  return chats[0];
}

export default factories.createCoreController(
  "api::chat.chat",
  ({ strapi }) => ({
    async find(ctx) {
      const user = await requireUser(ctx);

      return strapi.entityService.findMany("api::chat.chat", {
        filters: { user: user.id },
        populate: ["sources"],
      });
    },

    async findOne(ctx) {
      const user = await requireUser(ctx);
      return findUserChat(strapi, ctx.params.id, user.id, ["sources"]);
    },

    async create(ctx) {
      const user = await requireUser(ctx);

      return strapi.entityService.create("api::chat.chat", {
        data: {
          ...ctx.request.body?.data,
          user: user.id,
        },
      });
    },

    async update(ctx) {
      const user = await requireUser(ctx);
      const id = Number(ctx.params.id);

      await findUserChat(strapi, id, user.id);

      return strapi.entityService.update("api::chat.chat", id, {
        data: ctx.request.body?.data,
      });
    },

    async delete(ctx) {
      const user = await requireUser(ctx);
      const id = Number(ctx.params.id);

      await findUserChat(strapi, id, user.id);
      await strapi.entityService.delete("api::chat.chat", id);

      return { data: null };
    },

    async addSource(ctx) {
      const user = await requireUser(ctx);
      const id = Number(ctx.params.id);

      const chat = await findUserChat(strapi, id, user.id, ["sources"]);
      const sources = Array.isArray((chat as any).sources)
        ? (chat as any).sources
        : [];
      const MAX_SOURCES_PER_CHAT = 3;
      if (sources.length >= MAX_SOURCES_PER_CHAT) {
        return ctx.badRequest(
          `Only ${MAX_SOURCES_PER_CHAT} PDFs per chat allowed due to free limits.`,
        );
      }

      const files = ctx.request.files?.files;
      if (!files) return ctx.badRequest("No files provided");

      const fileList = Array.isArray(files) ? files : [files];
      const pdfs = fileList.filter(
        (f) =>
          f.mimetype === "application/pdf" ||
          f.originalFilename?.toLowerCase().endsWith(".pdf"),
      );
      if (pdfs.length !== fileList.length) {
        return ctx.badRequest("Only PDF files are allowed.");
      }

      const slotsLeft = MAX_SOURCES_PER_CHAT - sources.length;
      const toUpload = pdfs.slice(0, slotsLeft);

      const uploadService = strapi.plugin("upload").service("upload");

      await uploadService.upload({
        data: {
          ref: "api::chat.chat",
          refId: id,
          field: "sources",
        },
        files: toUpload,
      });

      return strapi.entityService.findOne("api::chat.chat", id, {
        populate: ["sources"],
      });
    },

    async removeSource(ctx) {
      const user = await requireUser(ctx);
      const chatId = Number(ctx.params.id);
      const sourceId = Number(ctx.params.sourceId);

      const chat = await findUserChat(strapi, chatId, user.id, ["sources"]);

      const sources = Array.isArray((chat as any).sources)
        ? (chat as any).sources
        : [];

      const remainingIds = sources
        .map((s: any) => s.id)
        .filter((id: number) => id !== sourceId);

      if (remainingIds.length === sources.length) {
        ctx.throw(404, "Source not found");
      }

      await strapi.entityService.update("api::chat.chat", chatId, {
        data: { sources: remainingIds },
      });

      const uploadService = strapi.plugin("upload").service("upload");
      const file = await uploadService.fetch({ id: sourceId });
      if (file) await uploadService.remove(file);

      return { data: null };
    },

    async getMessages(ctx) {
      const user = await requireUser(ctx);
      const chatId = Number(ctx.params.id);

      await findUserChat(strapi, chatId, user.id);
      return { data: await getConversation(chatId) };
    },

    async postMessageStream(ctx) {
      const user = await requireUser(ctx);
      const chatId = Number(ctx.params.id);

      const chat = await findUserChat(strapi, chatId, user.id, ["sources"]);

      const content = (
        ctx.request.body?.content ??
        ctx.request.body?.message ??
        ""
      ).trim();

      if (!content) ctx.throw(400, "Message content is required");

      ctx.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const stream = new PassThrough();
      ctx.body = stream;

      (async () => {
        try {
          for await (const chunk of sendMessageStream(
            chatId,
            chat.title,
            {
              name: user.username,
              email: user.email,
            },
            content,
            (chat as any).sources ?? [],
          )) {
            stream.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        } catch (err) {
          console.error("error", err);
          stream.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
        } finally {
          console.log("finally");
          stream.end();
        }
      })();
    },
  }),
);
