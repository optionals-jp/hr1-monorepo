import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hr1/shared-ui"],
  // TODO: @base-ui/react の型推論が shared-ui 経由で implicit any になる問題を解決後に削除する
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
