import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: ".next", // Ensure this is always ".next" for Vercel
  images: {
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "web-assets.same.dev",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "web-assets.same.dev",
        port: "",
        pathname: "/**",
      },
    ],
  },
  output: "standalone", // Add this to ensure all necessary files are included in the build
};

export default nextConfig;
