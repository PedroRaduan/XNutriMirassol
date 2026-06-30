export function isDatabaseUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && String(error.code) === "ECONNREFUSED") return true;

  const text = "message" in error ? String(error.message) : String(error);
  return (
    text.includes("ECONNREFUSED") ||
    text.includes("Can't reach database") ||
    text.includes("Connection refused") ||
    text.includes("Schema engine error")
  );
}

export function isDemoModeAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_DEMO_DATA !== "false";
}

export function demoFallbackOrThrow<T>(error: unknown, fallback: () => T): T {
  if (isDemoModeAllowed()) return fallback();
  throw error;
}
