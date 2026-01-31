import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // disable Lightning CSS / oxide in Next build
    optimizeCss: false
  }
};

export default nextConfig;
