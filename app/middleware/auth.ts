import { authClient } from "@/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch);

  if (!session.value) {
    return navigateTo({
      path: "/auth",
      query: {
        mode: "sign-in",
        redirect: to.fullPath,
      },
    });
  }
});
