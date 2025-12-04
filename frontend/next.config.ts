import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Permitir requisições cross-origin de IPs específicos em desenvolvimento
  allowedDevOrigins: [
    "10.10.24.104",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
