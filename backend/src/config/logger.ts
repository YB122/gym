import pino from "pino";

export type Logger = pino.Logger;

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-api-key']",
  "res.headers['set-cookie']",
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.secret",
  "*.apiKey",
  "*.cardNumber",
  "*.cvc",
];

export function createLogger(level: string): Logger {
  return pino({
    level,
    base: { service: "gym-api" },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACT_PATHS,
      censor: "[redacted]",
    },
  });
}
