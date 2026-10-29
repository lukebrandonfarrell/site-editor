import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "resend"],
  transpilePackages: ["@thereactnativerewind/site-editor"],
};

export default nextConfig;
