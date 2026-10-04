import type { H3Event } from "h3";
import { auth } from "#server/utils/auth";

export async function requireUser(event: H3Event) {
  const session = await auth.api.getSession({ headers: event.headers });

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: "Sign in to continue." });
  }

  return session.user;
}
