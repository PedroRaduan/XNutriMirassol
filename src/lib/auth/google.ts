import "server-only";
import { firstEnvironmentValue } from "@/lib/env";

export function getGoogleAuthCredentials() {
  return {
    clientId: firstEnvironmentValue(process.env.GOOGLE_CLIENT_ID, process.env.AUTH_GOOGLE_ID),
    clientSecret: firstEnvironmentValue(process.env.GOOGLE_CLIENT_SECRET, process.env.AUTH_GOOGLE_SECRET),
  };
}

export function isGoogleAuthConfigured() {
  const { clientId, clientSecret } = getGoogleAuthCredentials();
  return Boolean(clientId && clientSecret);
}
