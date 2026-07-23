import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "../../env";
import { seedNewUserDefaults } from "../../modules/users/commands/seed-new-user-defaults";
import { db } from "../db/client";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_APP_URL],
  // The only outward call shared/auth makes — everything about what happens
  // in the product when a user is created lives in modules/users, not here.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await seedNewUserDefaults(user.id);
        },
      },
    },
  },
  advanced: {
    // Browser calls apps/api directly (no proxy), so this cookie is always
    // cross-origin from apps/web's origin — sameSite: "none" is required for
    // it to be sent at all. Chrome treats localhost as a trustworthy origin,
    // so secure: true works in dev over plain HTTP too.
    // Production's exact attributes depend on final domain topology
    // (see design.md Open Questions) — revisit if apps/web/apps/api end up
    // on unrelated domains rather than subdomains of one root domain.
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },
});
