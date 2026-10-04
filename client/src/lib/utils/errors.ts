import { ApiClientError } from "@/lib/api/client";

/**
 * Converts an unknown error into a human-readable string.
 * Handles ApiClientError with field-level message arrays and generic errors.
 */
export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (err instanceof ApiClientError) {
    const msg = err.raw?.message;
    if (Array.isArray(msg) && msg.length > 0) return msg.join(", ");
    if (typeof msg === "string" && msg) return msg;
    if (err.statusCode === 409) return "A user with this email already exists.";
    if (err.statusCode === 404) return "User not found.";
    if (err.statusCode === 403) return "You do not have permission to do that.";
    if (err.statusCode === 401) return "Your session has expired. Please log in again.";
  }
  return fallback;
}
