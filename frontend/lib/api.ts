import type { ZodType } from "zod";

import { apiErrorSchema } from "./contracts";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | undefined;
  readonly details: unknown;

  constructor(
    code: string,
    message: string,
    status: number,
    requestId?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

/**
 * Typed fetch helper for the Express API. Always sends cookies and validates
 * the response with the shared Zod contract. Never call fetch directly from a
 * component.
 */
export async function apiFetch<T>(
  path: string,
  schema: ZodType<T>,
  init: ApiRequestInit = {},
): Promise<T> {
  const { body, headers, ...rest } = init;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    credentials: "include",
    headers: requestHeaders,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    throw new ApiError(
      parsed.success ? parsed.data.error.code : "HTTP_ERROR",
      parsed.success
        ? parsed.data.error.message
        : `Request failed with status ${response.status}.`,
      response.status,
      parsed.success ? parsed.data.error.requestId : undefined,
      parsed.success ? parsed.data.error.details : undefined,
    );
  }

  return schema.parse(payload);
}
