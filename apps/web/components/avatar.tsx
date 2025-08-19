/* components/avatar.tsx */
"use client";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;  // avatar_url
  size?: number;        // px
  className?: string;
};

export function Avatar({ src, size = 40, className }: Props) {
  if (!src) {
    /* 画像が無ければイニシャル or アイコンを表示 */
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gray-300 text-white",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        ?
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt="avatar"
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
    />
  );
}
