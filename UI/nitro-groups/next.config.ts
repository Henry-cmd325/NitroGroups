import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:5144/api";

    console.log("Rewriting API requests to:", backendUrl);

    return [
      {
        source: "/api/users/:path*",
        destination: `${backendUrl}/users/:path*`,
      },
      {
        source: "/api/musicians/:path*",
        destination: `${backendUrl}/musicians/:path*`,
      },
      {
        source: "/api/groups/:path*",
        destination: `${backendUrl}/groups/:path*`,
      },
      {
        source: "/api/auth/sync",
        destination: `${backendUrl}/auth/sync`,
      },
    ];
  },
};

export default nextConfig;
