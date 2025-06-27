/** @type {import('next').NextConfig} */
module.exports = {
  // ---------- 便利オプション ----------
  productionBrowserSourceMaps: true,

  // ---------- Lint / TS ----------
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // ---------- 画像 ----------
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
    ],
  },

  // ---------- Webpack ----------
  webpack(config) {
    // ① 内蔵 webpack を強制
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      webpack: require.resolve("next/dist/compiled/webpack/webpack.js"),
    };

    // ② ミニファイをバイパス（WebpackError 回避）
    config.optimization.minimize = false;
    return config;
  },

  // ---------- SWC 圧縮も保険で切る ----------
  swcMinify: false,
};