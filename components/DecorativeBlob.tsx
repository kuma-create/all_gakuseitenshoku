// components/DecorativeBlob.tsx
import clsx from "clsx";

type Props = {
  position?: "br" | "bl" | "tr" | "tl";
  size?: "sm" | "md" | "lg";
};
export default function DecorativeBlob({
  position = "br",
  size = "md",
}: Props) {
  const pos = {
    br: "bottom-0.5 right-6 sm:bottom-1 sm:right-8 md:bottom-2 md:right-10 lg:bottom-4 lg:right-12",
    bl: "bottom-0.5 left-6  sm:bottom-1 sm:left-8  md:bottom-2 md:left-10  lg:bottom-4 lg:left-12",
    tr: "top-6    right-8 sm:top-8    sm:right-10 md:top-10    md:right-12 lg:top-14    lg:right-16",
    tl: "top-6    left-8  sm:top-8    sm:left-10  md:top-10    md:left-12 lg:top-14    lg:left-16",
  }[position];

  const dims = {
    sm: "w-10 h-10",
    md: "w-12 h-12 sm:w-20 sm:h-20 md:w-32 md:h-32 lg:w-44 lg:h-44",
    lg: "w-20 h-20 md:w-36 md:h-36 lg:w-[460px] lg:h-[460px]",
  }[size];

  return (
    <div
      className={clsx(
        "pointer-events-none absolute rounded-full bg-white/10 blur-3xl animate-[blob_40s_ease-in-out_infinite] z-[-1]",
        pos,
        dims
      )}
    />
  );
}