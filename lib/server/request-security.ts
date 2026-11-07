import "server-only";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const configured = process.env.APP_ORIGIN;
  if (!origin || !configured || origin !== configured) throw new Error("INVALID_ORIGIN");
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") throw new Error("INVALID_CONTENT_TYPE");
}

export function safeApiError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  if (message === "UNAUTHENTICATED") return { status: 401, message: "Authentication required" };
  if (message === "FORBIDDEN") return { status: 403, message: "Insufficient permissions" };
  if (message === "INVALID_ORIGIN" || message === "INVALID_CONTENT_TYPE") return { status: 403, message: "Request rejected" };
  return { status: 500, message: "The request could not be completed" };
}
