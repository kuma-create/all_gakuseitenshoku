/** @type {import('next').NextConfig} */
const nextConfig = {
  /* --- ✅ 開発時のデバッグを楽にする ---------------- */
  productionBrowserSourceMaps: true,  // ←★ 追加

  /* --- 既存設定 ----------------------------------- */
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
