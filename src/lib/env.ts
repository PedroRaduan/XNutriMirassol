export function firstEnvironmentValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function isHostedProduction() {
  return (
    process.env.NODE_ENV === "production" &&
    (process.env.VERCEL === "1" || process.env.XNUTRI_DEPLOYMENT === "production")
  );
}
