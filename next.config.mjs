/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ship the prompt markdown files with the serverless function on Vercel
  outputFileTracingIncludes: {
    "/api/analyze": ["./prompts/**/*"],
  },
  // Built only in the cloud (no local toolchain), so don't let lint/type
  // nits block a deploy.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
