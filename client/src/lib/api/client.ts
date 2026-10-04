import type { ApiError } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string | string[],
    public readonly raw: ApiError,
  ) {
    super(Array.isArray(message) ? message.join(", ") : message);
    this.name = "ApiClientError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;
  const isFormData = options.body instanceof FormData;
  
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include", // send HTTP-only cookie automatically
      headers: {
        ...headers,
        ...options.headers,
      },
    });
  } catch {
    // Network failure (no connection, CORS, etc.)
    throw new ApiClientError(0, "Network error. Is the server running?", {
      statusCode: 0,
      message: "Network error. Is the server running?",
    });
  }

  if (!res.ok) {
    let errorBody: ApiError;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = {
        statusCode: res.status,
        message: res.statusText || "Request failed",
      };
    }
    throw new ApiClientError(
      res.status,
      errorBody.message ?? "Request failed",
      errorBody,
    );
  }

  // 204 No Content or empty body
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

export const client = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

