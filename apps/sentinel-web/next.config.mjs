/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // The e2e suite runs a second dev server (as a member) and needs its own build directory.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@anomaly/detector"],
  // Native / WASM packages must not be bundled.
  // Samples are capped at 4 MB (LIMITS.maxBytes); the default 1 MB server-action cap would reject them first.
  // 5mb leaves room for multipart overhead. Vercel itself caps request bodies at about 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  serverExternalPackages: ["re2", "pg", "@electric-sql/pglite"],
};
