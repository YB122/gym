import { describe, expect, it } from "vitest";

import { can } from "../../src/shared/contracts";

import { AppError } from "../../src/shared/errors/app-error";

describe("AppError", () => {
  it("keeps a stable code, status and safe message", () => {
    const error = new AppError("SESSION_FULL", "This class is full.", 409);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe("SESSION_FULL");
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe("This class is full.");
  });

  it("defaults to 400 and carries optional details", () => {
    const error = new AppError("VALIDATION_ERROR", "Invalid input.", 400, [{ path: "email" }]);

    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual([{ path: "email" }]);
  });
});

describe("permission defaults", () => {
  it("denies staff capabilities to members and coaches", () => {
    expect(can("member", "bookings:view")).toBe(false);
    expect(can("coach", "members:view")).toBe(false);
    expect(can("coach", "bookings:view")).toBe(true);
  });
});
