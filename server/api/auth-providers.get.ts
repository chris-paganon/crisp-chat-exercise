export default defineEventHandler(() => {
  const config = useRuntimeConfig();

  return { google: Boolean(config.googleClientId && config.googleClientSecret) };
});
