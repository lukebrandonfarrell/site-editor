import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "resend"],
  transpilePackages: ["@thereactnativerewind/inplace"],
};

export default nextConfig;
