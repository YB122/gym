import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@gym/shared"],
  outputFileTracingRoot: path.join(process.cwd(), ".."),
};

export default nextConfig;
