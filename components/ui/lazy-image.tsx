// src/components/ui/lazy-image.tsx
import Image, { ImageProps } from "next/image"

/**
 * すべての画像を “遅延 + ブラー” で表示する共通ラッパー
 * - loading="lazy" でビューポート外ロードを後回し
 * - sizes は画面幅ごとの適正サイズを指定（要調整）
 */
export function LazyImage(props: ImageProps) {
  return (
    <Image
      loading="lazy"
      placeholder="blur"
      sizes="(max-width:768px) 50vw, 33vw"
      {...props}
    />
  )
}
