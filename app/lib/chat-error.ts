export function chatError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data as { statusMessage?: string } | undefined;
    return data?.statusMessage || fallback;
  }
  return fallback;
}
