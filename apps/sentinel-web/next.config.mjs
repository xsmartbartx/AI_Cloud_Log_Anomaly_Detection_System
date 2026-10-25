import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
export default {
  // Self-contained server output for the Docker image (deploy/oci). Tracing starts at the repo root so
  // the workspace package packages/detector and native modules are copied in.
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  reactStrictMode: true,
  // The e2e suite runs a second dev server (as a member) and needs its own build directory.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@anomaly/detector"],
  // Native / WASM packages must not be bundled.
  // Samples are capped at 4 MB (LIMITS.maxBytes); the default 1 MB server-action cap would reject them first.
  // 5mb leaves room for multipart overhead. A reverse proxy in front must allow bodies of at least that size (Caddy does by default).
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  serverExternalPackages: ["re2", "pg", "@electric-sql/pglite"],
};
