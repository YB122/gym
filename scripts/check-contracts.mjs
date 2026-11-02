import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const files = ["backend/src/shared/contracts.ts", "frontend/lib/contracts.ts"];

const contents = files.map((file) => readFileSync(`${root}${file}`, "utf8"));

if (contents[0] !== contents[1]) {
  for (const [index, file] of files.entries()) {
    const hash = createHash("sha256").update(contents[index]).digest("hex").slice(0, 12);
    console.error(`${file}: sha256:${hash}`);
  }
  console.error(
    "Contract files differ. Update both copies so they are byte-for-byte identical.",
  );
  process.exit(1);
}

console.log("Contract files are in sync.");
