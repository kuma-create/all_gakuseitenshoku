/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },      // Supabase Storage
      { protocol: "https", hostname: "**.s3.amazonaws.com" }, // S3 など
    ],
  },
};

export default nextConfig;
