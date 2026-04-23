/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Browsers request /favicon.ico by default; serve the same asset as the SVG. */
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/favicon.svg" }];
  },
  /* Keep Node DB drivers out of the browser bundle; layout uses server auth only. */
  experimental: {
    serverComponentsExternalPackages: ["mongoose", "mongodb", "bcryptjs"],
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        dns: false,
        tls: false,
        fs: false,
        "fs/promises": false,
        child_process: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
