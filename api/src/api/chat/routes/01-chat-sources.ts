/**
 * Custom routes: chat sources (upload, remove) and conversation (messages).
 */

/** @type {import('@strapi/strapi').Core.RouterConfig} */
const config = {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/chats/:id/sources",
      handler: "api::chat.chat.addSource",
      config: {
        auth: { scope: ["api::chat.chat.addSource"] },
      },
    },
    {
      method: "DELETE",
      path: "/chats/:id/sources/:sourceId",
      handler: "api::chat.chat.removeSource",
      config: {
        auth: { scope: ["api::chat.chat.removeSource"] },
      },
    },
    {
      method: "GET",
      path: "/chats/:id/messages",
      handler: "api::chat.chat.getMessages",
      config: {
        auth: { scope: ["api::chat.chat.getMessages"] },
      },
    },
    {
      method: "POST",
      path: "/chats/:id/messages/stream",
      handler: "api::chat.chat.postMessageStream",
      config: {
        auth: { scope: ["api::chat.chat.postMessage"] },
      },
    },
    {
      method: "POST",
      path: "/chats/:id/messages",
      handler: "api::chat.chat.postMessage",
      config: {
        auth: { scope: ["api::chat.chat.postMessage"] },
      },
    },
  ],
};

export default config;
