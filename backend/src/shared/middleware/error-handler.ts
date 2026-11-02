import type { ErrorRequestHandler, Request, RequestHandler } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors/app-error";
import type { Logger } from "../../config/logger";

function requestIdOf(req: Request): string {
  return typeof req.id === "string" ? req.id : String(req.id ?? "");
}

function isBodyParserError(error: unknown): error is SyntaxError & { type: string; status: number } {
  return error instanceof SyntaxError && "body" in error && "type" in error;
}

export function notFoundHandler(req: Request, res: import("express").Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
      requestId: requestIdOf(req),
    },
  });
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    const requestId = requestIdOf(req);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
          requestId,
        },
      });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          requestId,
        },
      });
      return;
    }

    if (isBodyParserError(error) && error.type === "entity.too.large") {
      res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request body is too large.",
          requestId,
        },
      });
      return;
    }

    if (isBodyParserError(error) && error.status === 400) {
      res.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "Request body is not valid JSON.",
          requestId,
        },
      });
      return;
    }

    logger.error({ err: error, requestId, path: req.originalUrl }, "unhandled request error");
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong.",
        requestId,
      },
    });
  };
}

export function createNotFoundHandler(): RequestHandler {
  return notFoundHandler;
}
