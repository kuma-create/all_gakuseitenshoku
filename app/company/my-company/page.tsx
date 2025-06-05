'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type HighlightFormItem = {
  icon: string
  title: string
  body: string
}

type CompanyForm = {
  tagline: string
  representative: string
  founded_on: string
  capital_jpy: string
  revenue_jpy: string
  headquarters: string
  industry: string
  employee_count: string
  video_url: string
  philosophy: string[]
  businessAreas: string[]
  recruitMessage: string
  positions: string[]
  highlights: HighlightFormItem[]
}

/**
 * Narrowed row type for the columns this page actually needs from the
 * `companies` table.  Using this with `select<>()` keeps TypeScript happy
 * even when the generated Supabase types are stale.
 */
type CompaniesRow = {
  id: string
  tagline: string | null
  representative: string | null
  founded_on: string | null
  capital_jpy: string | null
  revenue_jpy: string | null
  headquarters: string | null
  industry: string | null
  employee_count: number | null
  video_url: string | null
}

export default function MyCompanyPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [form, setForm] = useState<CompanyForm>({
    tagline: '',
    representative: '',
    founded_on: '',
    capital_jpy: '',
    revenue_jpy: '',
    headquarters: '',
    industry: '',
    employee_count: '',
    video_url: '',
    philosophy: [''],
    businessAreas: [''],
    recruitMessage: '',
    positions: [''],
    highlights: [{ icon: 'growth', title: '', body: '' }],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 既存データ取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data, error } = await supabase
        .from('companies')
        .select(
          'id, tagline, representative, founded_on, capital_jpy, revenue_jpy, headquarters, industry, employee_count, video_url',
        )
        .eq('user_id', user.id)
        .single()
      const company = data as CompaniesRow | null
      if (error || !company) {
        setError(error?.message ?? '会社データが見つかりません')
        setLoading(false)
        return
      }
      setCompanyId(company.id)
      setForm((prev) => ({
        ...prev,
        tagline: company.tagline ?? '',
        representative: company.representative ?? '',
        founded_on: company.founded_on ?? '',
        capital_jpy: company.capital_jpy ?? '',
        revenue_jpy: company.revenue_jpy ?? '',
        headquarters: company.headquarters ?? '',
        industry: company.industry ?? '',
        employee_count: company.employee_count?.toString() ?? '',
        video_url: company.video_url ?? '',
      }))

      const [
        { data: philosophy },
        { data: businessAreas },
        { data: recruitInfo },
        { data: positions },
        { data: highlights },
      ] = await Promise.all([
        supabase
          .from('company_philosophy')
          .select('paragraph, ordinal')
          .eq('company_id', company.id)
          .order('ordinal'),
        supabase
          .from('company_business_areas')
          .select('area, ordinal')
          .eq('company_id', company.id)
          .order('ordinal'),
        supabase
          .from('company_recruit_info')
          .select('message')
          .eq('company_id', company.id)
          .single(),
        supabase
          .from('company_positions')
          .select('position, ordinal')
          .eq('company_id', company.id)
          .order('ordinal'),
        supabase
          .from('company_highlights')
          .select('icon, title, body, ordinal')
          .eq('company_id', company.id)
          .order('ordinal'),
      ])

      setForm((prev) => ({
        ...prev,
        philosophy: (philosophy?.map(p => p.paragraph ?? '') as string[]) ?? [''],
        businessAreas: (businessAreas?.map(b => b.area ?? '') as string[]) ?? [''],
        recruitMessage: recruitInfo?.message ?? '',
        positions: (positions?.map(p => p.position ?? '') as string[]) ?? [''],
        highlights:
          (highlights?.map(h => ({
            icon: h.icon ?? 'growth',
            title: h.title ?? '',
            body: h.body ?? '',
          })) as HighlightFormItem[]) ?? [{ icon: 'growth', title: '', body: '' }],
      }))
      setLoading(false)
    }
    fetchData()
  }, [router])

  // 配列フィールド操作
  const handleAddField = (key: keyof CompanyForm) => {
    setForm((prev) => ({
      ...prev,
      [key]: [...(prev[key] as string[]), ''],
    }))
  }

  const handleChangeArray = (
    key: keyof CompanyForm,
    index: number,
    value: string,
  ) => {
    setForm((prev) => {
      const arr = [...(prev[key] as string[])]
      arr[index] = value
      return { ...prev, [key]: arr }
    })
  }

  const handleAddHighlight = () => {
    setForm((prev) => ({
      ...prev,
      highlights: [...prev.highlights, { icon: 'growth', title: '', body: '' }],
    }))
  }

  const handleChangeHighlight = (index: number, key: keyof HighlightFormItem, value: string) => {
    setForm((prev) => {
      const list = [...prev.highlights]
      list[index] = { ...list[index], [key]: value }
      return { ...prev, highlights: list }
    })
  }

  // 送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    setSaving(true)

    // --- 基本情報更新 ---
    const updatePayload: Partial<CompaniesRow> = {
      tagline: form.tagline || null,
      representative: form.representative || null,
      founded_on: form.founded_on || null,
      capital_jpy: form.capital_jpy || null,
      revenue_jpy: form.revenue_jpy || null,
      headquarters: form.headquarters || null,
      industry: form.industry || null,
      employee_count: form.employee_count ? Number(form.employee_count) : null,
      video_url: form.video_url || null,
    }

    const { error: updateError } = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', companyId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    // 配列テーブル Upsert
    const upsertArray = async (
      table: string,
      column: string,
      values: string[],
    ) => {
      // 型の制約を回避するため <any> キャストを使用
      await supabase.from<any, any>(table).delete().eq('company_id', companyId)

      const payload = values
        .filter((v) => v.trim() !== '')
        .map((v, i) => ({
          company_id: companyId,
          ordinal: i,
          [column]: v,
        }))

      if (payload.length) {
        await supabase.from<any, any>(table).insert(payload)
      }
    }

    await Promise.all([
      upsertArray('company_philosophy', 'paragraph', form.philosophy),
      upsertArray('company_business_areas', 'area', form.businessAreas),
      supabase
        .from('company_recruit_info')
        .upsert({ company_id: companyId, message: form.recruitMessage }),
      upsertArray('company_positions', 'position', form.positions),
    ])

    // ハイライト upsert
    await supabase.from<any, any>('company_highlights').delete().eq('company_id', companyId)
    const hlPayload = form.highlights
      .filter((h) => h.title.trim() !== '' || h.body.trim() !== '')
      .map((h, i) => ({
        company_id: companyId,
        ordinal: i,
        icon: h.icon,
        title: h.title,
        body: h.body,
      }))
    if (hlPayload.length) {
      await supabase.from<any, any>('company_highlights').insert(hlPayload)
    }

    setSaving(false)
    router.refresh()
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">会社情報の編集</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="tagline">キャッチコピー</Label>
          <Input
            id="tagline"
            value={form.tagline}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tagline: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="representative">代表者</Label>
            <Input
              id="representative"
              value={form.representative}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  representative: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="founded_on">設立日</Label>
            <Input
              id="founded_on"
              type="date"
              value={form.founded_on}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  founded_on: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="capital_jpy">資本金 (円)</Label>
            <Input
              id="capital_jpy"
              type="number"
              value={form.capital_jpy}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  capital_jpy: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="revenue_jpy">売上高 (円)</Label>
            <Input
              id="revenue_jpy"
              type="number"
              value={form.revenue_jpy}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  revenue_jpy: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div>
          <Label htmlFor="headquarters">本社所在地</Label>
          <Input
            id="headquarters"
            value={form.headquarters}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                headquarters: e.target.value,
              }))
            }
          />
        </div>

        <div>
          <Label htmlFor="industry">業種</Label>
          <Input
            id="industry"
            value={form.industry}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                industry: e.target.value,
              }))
            }
          />
        </div>

        <div>
          <Label htmlFor="employee_count">従業員数</Label>
          <Input
            id="employee_count"
            type="number"
            value={form.employee_count}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                employee_count: e.target.value,
              }))
            }
          />
        </div>

        <div>
          <Label htmlFor="video_url">紹介動画 URL (YouTube embed)</Label>
          <Input
            id="video_url"
            value={form.video_url}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                video_url: e.target.value,
              }))
            }
          />
        </div>

        {/* 企業理念 */}
        <div>
          <Label>企業理念</Label>
          {form.philosophy.map((p, idx) => (
            <Textarea
              key={idx}
              className="mt-2"
              value={p}
              placeholder={`理念 ${idx + 1}`}
              onChange={(e) =>
                handleChangeArray('philosophy', idx, e.target.value)
              }
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={() => handleAddField('philosophy')}
          >
            行を追加
          </Button>
        </div>

        {/* 事業内容 */}
        <div>
          <Label>事業内容</Label>
          {form.businessAreas.map((a, idx) => (
            <Input
              key={idx}
              className="mt-2"
              value={a}
              placeholder={`事業領域 ${idx + 1}`}
              onChange={(e) =>
                handleChangeArray('businessAreas', idx, e.target.value)
              }
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={() => handleAddField('businessAreas')}
          >
            行を追加
          </Button>
        </div>

        {/* 採用メッセージ */}
        <div>
          <Label htmlFor="recruitMessage">採用メッセージ</Label>
          <Textarea
            id="recruitMessage"
            value={form.recruitMessage}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                recruitMessage: e.target.value,
              }))
            }
          />
        </div>

        {/* 募集ポジション */}
        <div>
          <Label>募集ポジション</Label>
          {form.positions.map((p, idx) => (
            <Input
              key={idx}
              className="mt-2"
              value={p}
              placeholder={`ポジション ${idx + 1}`}
              onChange={(e) =>
                handleChangeArray('positions', idx, e.target.value)
              }
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={() => handleAddField('positions')}
          >
            行を追加
          </Button>
        </div>

        {/* 企業の魅力 */}
        <div>
          <Label>企業の魅力</Label>
          {form.highlights.map((h, idx) => (
            <div key={idx} className="border p-4 mt-2 rounded-md space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="アイコン (growth/training/diversified)"
                  value={h.icon}
                  onChange={(e) => handleChangeHighlight(idx, 'icon', e.target.value)}
                />
                <Input
                  placeholder="タイトル"
                  value={h.title}
                  onChange={(e) => handleChangeHighlight(idx, 'title', e.target.value)}
                />
              </div>
              <Textarea
                placeholder="説明"
                value={h.body}
                onChange={(e) => handleChangeHighlight(idx, 'body', e.target.value)}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={handleAddHighlight}
          >
            行を追加
          </Button>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存する'}
        </Button>
      </form>
    </div>
  )
}