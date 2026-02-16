import type { Core } from "@strapi/strapi";

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  "users-permissions": {
    config: {
      jwtManagement: env("JWT_MANAGEMENT"),
      sessions: {
        accessTokenLifespan: env("JWT_SECRET_LIFESPAN_ACCESS_TOKEN"),
        maxRefreshTokenLifespan: env("JWT_SECRET_LIFESPAN_REFRESH"),
        idleRefreshTokenLifespan: env("JWT_SECRET_LIFESPAN_IDLE_REFRESH"),
        httpOnly: env("JWT_SECRET_COOKIE_HTTP_ONLY"),
        cookie: {
          name: env("JWT_SECRET_COOKIE_NAME"),
          sameSite: env("JWT_SECRET_COOKIE_SAME_SITE"),
          path: env("JWT_SECRET_COOKIE_PATH"),
          secure: env("JWT_SECRET_COOKIE_SECURE"),
        },
      },
    },
  },
});

export default config;
