export function firstEnvironmentValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function isHostedProduction() {
  return (
    process.env.NODE_ENV === "production" &&
    (process.env.VERCEL === "1" ||
      Boolean(process.env.RAILWAY_ENVIRONMENT) ||
      process.env.RENDER === "true" ||
      process.env.XNUTRI_DEPLOYMENT === "production")
  );
}
