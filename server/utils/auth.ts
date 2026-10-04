import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { z } from "zod";
import { getDb } from "#server/db";
import { user, session, account, verification } from "#server/db/schema";
import { sendAuthEmail } from "#server/utils/email";

const userNameSchema = z.string()
  .trim()
  .min(1, "Enter your name.")
  .max(100, "Name must be 100 characters or fewer.")
  .regex(/^[^<>]*$/, "Name cannot contain HTML markup.");

const config = useRuntimeConfig();

export const auth = betterAuth({
  secret: config.betterAuthSecret,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: user,
      session: session,
      account: account,
      verification: verification,
    },
  }),
  baseURL: config.betterAuthUrl,
  socialProviders: config.googleClientId && config.googleClientSecret
    ? {
        google: {
          clientId: config.googleClientId,
          clientSecret: config.googleClientSecret,
        },
      }
    : {},
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const isSignUp = ctx.path === "/sign-up/email";
      const isUserUpdate = ctx.path === "/update-user";

      if (!isSignUp && !isUserUpdate) {
        return;
      }

      if (isUserUpdate && ctx.body?.name === undefined) {
        return;
      }

      const result = userNameSchema.safeParse(ctx.body?.name);

      if (!result.success) {
        throw new APIError("BAD_REQUEST", {
          message: result.error.issues[0]?.message ?? "Enter a valid name.",
        });
      }

      return {
        context: {
          ...ctx,
          body: {
            ...ctx.body,
            name: result.data,
          },
        },
      };
    }),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      void sendAuthEmail({
        actionLabel: "Verify email",
        actionUrl: url,
        body: "Confirm your email address to finish setting up your account.",
        preheader: "Verify your email address to start using Dockiy.",
        recipient: user,
        subject: "Verify your Dockiy email",
        title: "Verify your email",
      }).catch((error) => {
        console.error("Failed to send verification email.", error);
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      void sendAuthEmail({
        actionLabel: "Reset password",
        actionUrl: url,
        body: "Use this secure link to choose a new password. The link expires in one hour.",
        preheader: "Reset your Dockiy password.",
        recipient: user,
        subject: "Reset your Dockiy password",
        title: "Reset your password",
      }).catch((error) => {
        console.error("Failed to send password reset email.", error);
      });
    },
  },
});
