"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ArticleCardProps {
  id?: string; // optional, used when link is auto‑generated
  title: string;
  excerpt: string;
  imageUrl: string;
  category?: string;
  date?: string; // YYYY‑MM‑DD
  link?: string; // explicit link overrides id
  featured?: boolean;
  onClick?: () => void;
}

export default function ArticleCard({
  id,
  title,
  excerpt,
  imageUrl,
  category = "その他",
  date,
  link,
  featured = false,
  onClick,
}: ArticleCardProps) {
  // fall‑back thumbnail
  const safeImageUrl =
    imageUrl && imageUrl.trim() !== "" ? imageUrl : "/logo3.png";

  // Choose wrapper element based on whether a link / id is provided
  const href = link ?? (id ? `/articles/${id}` : undefined);
  const Wrapper: React.ElementType = href ? Link : "div";
  const wrapperProps = href ? { href } : {};

  // Shared motion wrapper
  const MotionWrapper: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );

  const Thumbnail = () => (
    <div className="relative aspect-[4/3] overflow-hidden">
      <Image
        src={safeImageUrl}
        alt={title}
        fill
        sizes="(min-width: 1024px) 25vw, 50vw"
        placeholder="blur"
        blurDataURL={safeImageUrl}
        className="object-cover transition-transform duration-300 group-hover:scale-105 group-hover:brightness-90"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/logo3.png";
        }}
      />
      <Badge className="absolute top-3 left-3 rounded-full bg-white/80 text-gray-800 backdrop-blur-sm ring-1 ring-gray-200">
        {category}
      </Badge>
    </div>
  );

  // ---------- Featured style ----------
  if (featured) {
    return (
      <MotionWrapper>
        <Wrapper
          {...wrapperProps}
          className="group block cursor-pointer"
          onClick={onClick}
        >
          <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-shadow">
            <Thumbnail />
            <CardContent className="p-6 flex flex-col gap-2">
              {date && (
                <time
                  dateTime={date}
                  className="text-sm text-gray-500 tracking-wide"
                >
                  {date}
                </time>
              )}
              <h2 className="text-2xl font-bold line-clamp-2">{title}</h2>
              <p className="text-gray-600 line-clamp-3">{excerpt}</p>
              <span className="mt-auto text-sm text-red-600 font-medium hover:underline underline-offset-4">
                続きを読む
              </span>
            </CardContent>
          </Card>
        </Wrapper>
      </MotionWrapper>
    );
  }

  // ---------- Regular card ----------
  return (
    <MotionWrapper>
      <Wrapper
        {...wrapperProps}
        className="group block h-full cursor-pointer"
        onClick={onClick}
      >
        <Card className="overflow-hidden h-full border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
          <Thumbnail />
          <CardContent className="p-4 flex flex-col gap-2">
            {date && (
              <time
                dateTime={date}
                className="text-xs text-gray-500 tracking-wide"
              >
                {date}
              </time>
            )}
            <h3 className="text-lg font-bold line-clamp-2">{title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{excerpt}</p>
          </CardContent>
        </Card>
      </Wrapper>
    </MotionWrapper>
  );
}
