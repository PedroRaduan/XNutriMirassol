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
