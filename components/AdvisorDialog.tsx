// components/AdvisorDialog.tsx
"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import CareerAdvisorChat from "@/components/career-advisor-chat"

export default function AdvisorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
  w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw]
  sm:max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl
  max-h-[90vh] sm:max-h-[85vh] md:max-h-[80vh]
  overflow-y-auto
  p-4 sm:p-6
  space-y-6
"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            GPTキャリアアドバイザー
          </DialogTitle>
        </DialogHeader>

        {/* 🟢 ポップアップ内の本体 */}
        <CareerAdvisorChat />
      </DialogContent>
    </Dialog>
  )
}