export function getAuthRedirect(redirect: unknown): string {
  if (typeof redirect !== "string" || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/operator";
  }

  // URL parsing also catches backslashes and whitespace hiding an external host.
  const origin = "https://auth.invalid";
  try {
    return new URL(redirect, origin).origin === origin ? redirect : "/operator";
  }
  catch {
    return "/operator";
  }
}
