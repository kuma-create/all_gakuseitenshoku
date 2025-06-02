

"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

type Props = {
  /** 現在選択中（親フォームから渡す） */
  value: string[]
  /** 選択が変わったら親に通知 */
  onChange: (skills: string[]) => void
}

/** ──────────────── マスターデータ ────────────────
 *  ※ 将来的に Supabase 側へ移して fetch しても OK
 */
const SKILLS: Record<string, string[]> = {
  // 言語系（主要のみ／必要に応じて追加）
  言語: [
    "英語",
    "日本語",
    "中国語",
    "韓国語",
    "フランス語",
    "ドイツ語",
    "スペイン語",
    "イタリア語",
    "ポルトガル語",
    "ロシア語",
    "アラビア語",
    // ...
  ],

  視覚言語: ["手話", "日本手話"],

  // プログラミング言語
  プログラミング: [
    "TypeScript",
    "JavaScript",
    "Python",
    "Java",
    "C",
    "C++",
    "C#",
    "Go",
    "Rust",
    "PHP",
    "Ruby",
    "Swift",
    "Kotlin",
    "Scala",
    "R",
    "HTML",
    "CSS",
    // ...
  ],

  // データ分析・AI
  "データ分析・AI": [
    "NumPy",
    "Pandas",
    "SciPy",
    "matplotlib",
    "seaborn",
    "scikit-learn",
    "TensorFlow",
    "PyTorch",
    "LightGBM",
    "XGBoost",
    "Keras",
    // ...
  ],

  // クリエイティブ
  クリエイティブ: [
    "Adobe Photoshop",
    "Adobe Illustrator",
    "Adobe Premiere Pro",
    "Adobe After Effects",
    "Adobe XD",
    "Figma",
    "Sketch",
    "Canva",
    "DaVinci Resolve",
  ],
}

export default function SkillPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => new Set(value), [value])

  const toggle = (skill: string) => {
    const next = new Set(selected)
    next.has(skill) ? next.delete(skill) : next.add(skill)
    onChange(Array.from(next))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {value.length ? `${value.slice(0, 3).join(", ")}${value.length > 3 ? "… 他" : ""}` : "スキルを選択"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>スキルを追加</DialogTitle>
        </DialogHeader>

        {Object.entries(SKILLS).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h3 className="font-semibold mb-2">{category}</h3>
            <ul className="space-y-2">
              {items.map((it) => {
                const checked = selected.has(it)
                return (
                  <li
                    key={it}
                    className="flex items-center space-x-2 hover:bg-gray-50 rounded px-2 py-1"
                  >
                    <Checkbox
                      id={it}
                      checked={checked}
                      onCheckedChange={() => toggle(it)}
                    />
                    <label
                      htmlFor={it}
                      className="text-sm cursor-pointer select-none flex-1"
                    >
                      {it}
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  )
}