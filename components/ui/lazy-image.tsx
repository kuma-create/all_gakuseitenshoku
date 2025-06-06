/* src/components/ui/lazy-image.tsx */
"use client";

import Image, { ImageProps } from "next/image";

interface LazyImageProps extends Omit<ImageProps, "alt"> {
  /** Alternative text for accessibility.  
   *  Optional — defaults to an empty string so runtime never crashes. */
  alt?: string;
}

export function LazyImage({
  alt = "",
  priority,
  placeholder = "blur",
  blurDataURL,
  ...rest
}: LazyImageProps) {
  // priority が無い場合だけ loading="lazy"
  const loadingAttr =
    priority || rest.loading ? {} : { loading: "lazy" as const };

  // blurDataURL が無い blur 指定はエラーになるので empty へ
  const safePlaceholder =
    placeholder === "blur" && !blurDataURL ? "empty" : placeholder;

  return (
    <Image
      alt={alt}
      {...rest}
      priority={priority}
      placeholder={safePlaceholder as "blur" | "empty" | undefined}
      blurDataURL={blurDataURL}
      sizes="(max-width:768px) 50vw, 33vw"
      {...loadingAttr}
    />
  );
}
