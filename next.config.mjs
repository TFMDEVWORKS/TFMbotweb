/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiOrigin = process.env.ADMIN_API_ORIGIN || "http://localhost:7071";
    return [{ source: "/api/manage/:path*", destination: `${apiOrigin}/api/manage/:path*` }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "vwpkotzpsdipgjndylsc.supabase.co" },
    ],
  },
};

export default nextConfig;
