"use client"

import * as React from "react"
import { AreaChart, BarChart, LineChart, PieChart } from "recharts"

import { cn } from "@/lib/utils"

const ChartContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("h-[350px] w-full overflow-hidden", className)} {...props} />
  ),
)
ChartContainer.displayName = "ChartContainer"

const ChartTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-semibold text-sm text-foreground", className)} {...props} />
  ),
)
ChartTitle.displayName = "ChartTitle"

const ChartDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
)
ChartDescription.displayName = "ChartDescription"

const ChartLegend = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-wrap items-center gap-4 text-sm", className)} {...props} />
  ),
)
ChartLegend.displayName = "ChartLegend"

const ChartLegendItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    color?: string
  }
>(({ className, color, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center gap-1", className)} {...props}>
    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
  </div>
))
ChartLegendItem.displayName = "ChartLegendItem"

const ChartTooltip = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("border bg-background p-2 shadow-sm rounded-lg text-sm", className)} {...props} />
  ),
)
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    color?: string
  }
>(({ className, color, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center gap-1", className)} {...props}>
    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
  </div>
))
ChartTooltipItem.displayName = "ChartTooltipItem"

export {
  ChartContainer,
  ChartTitle,
  ChartDescription,
  ChartLegend,
  ChartLegendItem,
  ChartTooltip,
  ChartTooltipItem,
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
}
