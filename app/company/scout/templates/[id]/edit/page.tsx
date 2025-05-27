"use client"
import { supabase } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { Database } from "@/lib/supabase/types"

type TemplateForm = {
  title: string
  content: string
  is_global: boolean
}

export default function TemplateEdit() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === "new"
  const [tpl, setTpl] = useState<TemplateForm>({
    title: "",
    content: "",
    is_global: false,
  })

  useEffect(() => {
    if (isNew) return
    supabase
      .from("scout_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTpl({
            title: data.title ?? "",
            content: data.content ?? "",
            is_global: data.is_global ?? false,
          })
        }
      })
  }, [id, isNew])

  const handleSave = async () => {
    // TODO: 実際の company_id を取得して差し込む
    const payload: Database["public"]["Tables"]["scout_templates"]["Insert"] = {
      ...tpl,
      company_id: "", // 一時的な空文字で型エラーを回避
    }
    if (isNew) {
      await supabase.from("scout_templates").insert(payload)
    } else {
      await supabase.from("scout_templates").update(payload).eq("id", id)
    }
    router.push("/company/scout/templates")
  }

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <Input
        placeholder="タイトル"
        value={tpl.title}
        onChange={(e) => setTpl({ ...tpl, title: e.target.value })}
      />
      <Textarea
        placeholder="本文 (Markdown 可)"
        className="h-64"
        value={tpl.content}
        onChange={(e) => setTpl({ ...tpl, content: e.target.value })}
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={tpl.is_global}
          onChange={(e) => setTpl({ ...tpl, is_global: e.target.checked })}
        />
        全社で共有する
      </label>
      <Button onClick={handleSave}>保存</Button>
    </div>
  )
}