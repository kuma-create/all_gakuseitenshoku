import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface AchievementBadgeProps {
  id: string
  name: string
  description: string
  icon: ReactNode
  earned: boolean
  earnedDate?: string
  progress?: number
  maxProgress?: number
  variant?: "gold" | "silver" | "bronze" | "blue" | "green" | "default"
  size?: "sm" | "md" | "lg"
  showTooltip?: boolean
}

export function AchievementBadge({
  name,
  description,
  icon,
  earned = false,
  earnedDate,
  progress,
  maxProgress,
  variant = "default",
  size = "md",
  showTooltip = true,
}: AchievementBadgeProps) {
  const badgeContent = (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border p-3 transition-all",
        earned
          ? {
              gold: "border-yellow-300 bg-yellow-50",
              silver: "border-gray-300 bg-gray-50",
              bronze: "border-amber-300 bg-amber-50",
              blue: "border-blue-300 bg-blue-50",
              green: "border-green-300 bg-green-50",
              default: "border-primary/20 bg-primary/10",
            }[variant]
          : "border-gray-200 bg-gray-100 opacity-50",
        {
          sm: "h-16 w-16",
          md: "h-20 w-20",
          lg: "h-24 w-24",
        }[size],
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          earned
            ? {
                gold: "bg-yellow-100 text-yellow-700",
                silver: "bg-gray-100 text-gray-700",
                bronze: "bg-amber-100 text-amber-700",
                blue: "bg-blue-100 text-blue-700",
                green: "bg-green-100 text-green-700",
                default: "bg-primary/20 text-primary",
              }[variant]
            : "bg-gray-200 text-gray-400",
          {
            sm: "h-8 w-8 text-lg",
            md: "h-10 w-10 text-xl",
            lg: "h-12 w-12 text-2xl",
          }[size],
        )}
      >
        {icon}
      </div>
      <span
        className={cn(
          "mt-2 text-center text-xs font-medium",
          earned
            ? {
                gold: "text-yellow-800",
                silver: "text-gray-800",
                bronze: "text-amber-800",
                blue: "text-blue-800",
                green: "text-green-800",
                default: "text-primary",
              }[variant]
            : "text-gray-500",
        )}
      >
        {name}
      </span>
      {progress !== undefined && maxProgress !== undefined && (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn(
              "h-full rounded-full",
              {
                gold: "bg-yellow-500",
                silver: "bg-gray-500",
                bronze: "bg-amber-500",
                blue: "bg-blue-500",
                green: "bg-green-500",
                default: "bg-primary",
              }[variant],
            )}
            style={{ width: `${Math.min(100, (progress / maxProgress) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )

  if (!showTooltip) {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{badgeContent}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 p-1">
            <div className="font-medium">{name}</div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {earnedDate && earned && (
              <Badge variant="outline" className="mt-1">
                獲得日: {earnedDate}
              </Badge>
            )}
            {progress !== undefined && maxProgress !== undefined && !earned && (
              <div className="text-xs text-muted-foreground">
                進捗: {progress}/{maxProgress}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function SmallBadge({
  name,
  icon,
  variant = "default",
  earned = true,
  showTooltip = true,
  description,
}: {
  name: string
  icon: ReactNode
  variant?: "gold" | "silver" | "bronze" | "blue" | "green" | "default"
  earned?: boolean
  showTooltip?: boolean
  description?: string
}) {
  const badgeContent = (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5",
        earned
          ? {
              gold: "border-yellow-200 bg-yellow-50 text-yellow-800",
              silver: "border-gray-200 bg-gray-50 text-gray-800",
              bronze: "border-amber-200 bg-amber-50 text-amber-800",
              blue: "border-blue-200 bg-blue-50 text-blue-800",
              green: "border-green-200 bg-green-50 text-green-800",
              default: "border-primary/20 bg-primary/10 text-primary",
            }[variant]
          : "border-gray-200 bg-gray-100 text-gray-500 opacity-60",
      )}
    >
      <span className="text-sm">{icon}</span>
      <span className="text-xs font-medium">{name}</span>
    </div>
  )

  if (!showTooltip || !description) {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{badgeContent}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="max-w-xs text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
