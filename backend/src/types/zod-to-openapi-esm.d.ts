/**
 * `@asteasolutions/zod-to-openapi` ships both CJS and ESM builds but has no
 * `exports` map, so Node resolves the CJS build even from ESM. That build
 * patches the CJS copy of zod, while the app imports zod's ESM build — two
 * module instances, and `registry.register` then fails because the schemas
 * never received `.openapi()`. Importing the ESM file directly avoids the
 * dual-package hazard. Re-export the official types for the subpath.
 */
declare module "@asteasolutions/zod-to-openapi/dist/index.mjs" {
  export * from "@asteasolutions/zod-to-openapi";
}
