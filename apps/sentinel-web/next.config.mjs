/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: ["@anomaly/detector"],
  // Native / WASM packages must not be bundled.
  serverExternalPackages: ["re2", "pg", "@electric-sql/pglite"],
};
