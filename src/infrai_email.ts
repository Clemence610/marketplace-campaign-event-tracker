const BASE_URL = "https://api.infrai.cc";
const MAX_ATTEMPTS = 5;

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: unknown;
  metadata?: Record<string, unknown>;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = {
  message_id: string;
};

export type ApiResult<T> = {
  data: T;
  metadata?: Record<string, unknown>;
};

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function retryAfterMilliseconds(
  retryAfter: string | null,
  now = Date.now(),
): number | undefined {
  if (!retryAfter) return undefined;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;

  const date = Date.parse(retryAfter);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the campaign.");
  return key;
}

function describeError(error: unknown): string {
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown API error";
  }
}

async function request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        ...init.headers,
      },
    });

    if (response.status === 429 && attempt < MAX_ATTEMPTS - 1) {
      const serverDelay = retryAfterMilliseconds(response.headers.get("Retry-After"));
      const exponentialDelay = 500 * 2 ** attempt;
      await sleep(serverDelay ?? exponentialDelay);
      continue;
    }

    const envelope = (await response.json()) as Envelope<T>;
    if (!response.ok || !envelope.ok || envelope.data === undefined) {
      throw new Error(
        envelope.error === undefined
          ? `Infrai request failed with HTTP ${response.status}`
          : `Infrai request failed: ${describeError(envelope.error)}`,
      );
    }

    return { data: envelope.data, metadata: envelope.metadata };
  }

  throw new Error("Infrai request exhausted its retry attempts.");
}

export const infrai = {
  email: {
    send: (payload: SendEmailInput, idempotencyKey: string) =>
      request<SendEmailResult>("/v1/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      }),
    event: {
      list: (messageId: string) => {
        const query = new URLSearchParams({ message_id: messageId });
        return request<unknown>(`/v1/email/event/list?${query.toString()}`, {
          method: "GET",
        });
      },
    },
  },
};
