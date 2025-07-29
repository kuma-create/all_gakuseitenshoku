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
        className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 space-y-6"
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