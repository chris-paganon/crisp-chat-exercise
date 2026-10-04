import { authClient } from "@/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch);
  if (!session.value || session.value.user.isAnonymous) {
    return navigateTo({ path: "/auth", query: { mode: "sign-in", redirect: to.fullPath } });
  }
});
