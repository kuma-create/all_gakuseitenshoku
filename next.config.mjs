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
  },
}

// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },      // Supabase Storage
      { protocol: "https", hostname: "**.s3.amazonaws.com" }, // AWS S3
    ],
  },
}



export default nextConfig
