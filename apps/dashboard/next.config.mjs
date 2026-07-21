/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source, so Next must compile them.
  transpilePackages: [
    "@servvo/canonical",
    "@servvo/policy",
    "@servvo/audit",
    "@servvo/db",
    "@astryxdesign/core",
  ],
};

export default nextConfig;
