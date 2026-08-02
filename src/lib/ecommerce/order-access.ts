import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

type OrderAccessTarget = {
  userId: string | null;
  accessTokenHash: string | null;
};

type Viewer = { id?: string | null } | null | undefined;

export function createOrderAccessToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashOrderAccessToken(token) };
}

export function hashOrderAccessToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function canAccessOrder(order: OrderAccessTarget, viewer: Viewer, token?: string | null) {
  if (order.userId && viewer?.id === order.userId) return true;
  if (!order.accessTokenHash || !token || token.length < 32 || token.length > 128) return false;

  const candidate = Buffer.from(hashOrderAccessToken(token), "hex");
  const expected = Buffer.from(order.accessTokenHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
