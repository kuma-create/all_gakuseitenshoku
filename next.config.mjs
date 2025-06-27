/** @type {import('next').NextConfig} */
const nextConfig = {
  /* ------------------------------------------------------------------
   * ✅ 便利オプション
   * ------------------------------------------------------------------ */
  // 本番でもブラウザのソースマップを生成（デバッグ用）
  productionBrowserSourceMaps: true,

  /* ------------------------------------------------------------------
   * ✅ Lint / TypeScript
   * ------------------------------------------------------------------ */
  eslint: {
    ignoreDuringBuilds: true,  // ビルドエラーで落とさない
  },
  typescript: {
    ignoreBuildErrors: true,   // 型エラーで落とさない
  },

  /* ------------------------------------------------------------------
   * ✅ 画像ホワイトリスト
   * ------------------------------------------------------------------ */
  images: {
    unoptimized: true,         // Next-Image の最適化を無効化
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },      // Supabase Storage
      { protocol: "https", hostname: "**.s3.amazonaws.com" }, // S3 など
    ],
  },

  /* ------------------------------------------------------------------
   * ✅ Webpack: 外部 require('webpack') 衝突対策
   * ------------------------------------------------------------------ */
  webpack(config, { webpack }) {
    // すべての require('webpack') が Next 同梱版を参照するよう強制
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      webpack: require.resolve("next/dist/compiled/webpack/webpack.js"),
    };

    /* ここに他のカスタム設定を追加する場合は下に書く */
    return config;
  },
};

export default nextConfig;