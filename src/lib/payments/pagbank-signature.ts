import { createHash, timingSafeEqual } from "node:crypto";

export function validatePagBankWebhookSignature(rawBody: string, signature: string | null) {
  const webhookToken = process.env.PAGBANK_WEBHOOK_TOKEN?.trim() || process.env.PAGBANK_TOKEN?.trim();
  if (!webhookToken || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHash("sha256").update(`${webhookToken}-${rawBody}`, "utf8").digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}
