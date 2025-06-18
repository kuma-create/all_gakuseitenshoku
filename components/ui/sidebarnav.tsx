

import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

/* ---------- Types ---------- */
export type SidebarItem = {
  title: string;
  icon: LucideIcon;
  href: string;
  gradient: string;
  bgGradient: string;
  count: string;
  /** 現在表示中のページかどうか */
  active?: boolean;
};

type SidebarNavProps = {
  /** サイドバーに並べるアイテムの配列 */
  items: readonly SidebarItem[];
};

/* ---------- Component ---------- */
export function SidebarNav({ items }: SidebarNavProps) {
  return (
    <nav className="space-y-4">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="block group">
          <Card
            className={`overflow-hidden transition-all duration-300 border-0 ${
              item.active
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg"
                : `bg-gradient-to-r ${item.bgGradient} hover:shadow-lg hover:-translate-y-1`
            }`}
          >
            <div className="flex items-center gap-4 px-5 py-4 font-semibold text-sm">
              {/* Icon */}
              <span
                className={`p-2 rounded-lg ${
                  item.active
                    ? "bg-white/20"
                    : `bg-gradient-to-r ${item.gradient} text-white`
                }`}
              >
                <item.icon className="w-5 h-5" />
              </span>

              {/* Title */}
              <span className={item.active ? "text-white" : "text-gray-800"}>
                {item.title}
              </span>

              {/* Count */}
              {item.count && (
                <span
                  className={`ml-auto text-xs font-normal ${
                    item.active ? "text-white/80" : "text-gray-500"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </nav>
  );
}