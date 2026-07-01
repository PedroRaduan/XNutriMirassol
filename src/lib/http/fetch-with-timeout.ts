type FetchTimeoutOptions = {
  timeoutMs?: number;
  timeoutMessage?: string;
};

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchTimeoutOptions = {},
) {
  const parentSignal = init.signal;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 12_000;
  let timedOut = false;

  const abortFromParent = () => controller.abort();

  if (parentSignal?.aborted) {
    controller.abort();
  } else {
    parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new Error(options.timeoutMessage ?? "A consulta demorou mais que o esperado. Tente novamente.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}
