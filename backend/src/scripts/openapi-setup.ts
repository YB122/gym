/**
 * Zod 4's schema factory copies prototype extensions onto each instance when
 * the schema is created, so `extendZodWithOpenApi` must run before any schema
 * is imported. This side-effect module is imported first by the OpenAPI script.
 *
 * Never import this from application code: only the docs generator needs the
 * `.openapi()` method.
 */
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi/dist/index.mjs";
import { z } from "zod";

extendZodWithOpenApi(z);
