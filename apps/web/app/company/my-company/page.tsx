'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Calendar, Star, Users, Building2 } from "lucide-react"

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
  logo: string
  cover_image: string
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
  founded_year: number | null
  capital_jpy: number | null
  revenue_jpy: number | null
  location: string | null      // ← headquarters として扱う
  industry: string | null
  employee_count: number | null
  video_url: string | null
  logo: string | null
  cover_image: string | null
}

const INDUSTRY_OPTIONS = [
  'IT・通信',
  'メーカー',
  '商社',
  '金融',
  'コンサルティング',
  'マスコミ',
  '広告・マーケティング',
  'サービス',
  '小売・流通',
  '医療・福祉',
  '教育',
  '公務員',
] as const;

/** YouTube URL pattern: matches youtube.com/watch?v=… or youtu.be/… */
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i;

const iconToEmoji = (key: string) => {
  switch (key) {
    case 'growth': return '🏃‍♂️'
    case 'training': return '📚'
    case 'diversified': return '🌐'
    case 'innovation': return '💡'
    case 'worklife': return '⚖️'
    case 'benefits': return '🎁'
    case 'sustainability': return '🌱'
    case 'remote': return '🏠'
    case 'culture': return '🤝'
    default: return '✨'
  }
}

const toYouTubeEmbedUrl = (url: string) => {
  if (!url) return ''
  try {
    if (/youtu\.be\//.test(url)) {
      const id = url.split('youtu.be/')[1].split(/[?&#]/)[0]
      return `https://www.youtube.com/embed/${id}`
    }
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      if (u.pathname.includes('/embed/')) return url
    }
  } catch {}
  return ''
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
    logo: '',
    cover_image: '',
  })
  const [loading, setLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

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
      // recruiter / owner 共通取得: company_members 経由で JOIN
      const { data: member, error: memberErr } = await supabase
        .from('company_members')
        .select(
          'company_id, companies(id, tagline, representative, founded_year, capital_jpy, revenue_jpy, location, industry, employee_count, video_url, logo, cover_image)'
        )
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberErr) {
        setError(memberErr.message)
        setLoading(false)
        return
      }

      const company = member?.companies as CompaniesRow | undefined
      if (!company) {
        setError('会社データが見つかりません')
        setLoading(false)
        return
      }
      setCompanyId(company.id)
      setForm((prev) => ({
        ...prev,
        tagline: company.tagline ?? '',
        representative: company.representative ?? '',
        founded_on: company.founded_year ? `${company.founded_year}-01-01` : '',
        capital_jpy: company.capital_jpy !== null ? String(company.capital_jpy) : '',
        revenue_jpy: company.revenue_jpy !== null ? String(company.revenue_jpy) : '',
        headquarters: company.location ?? '',
        industry: company.industry ?? '',
        employee_count: company.employee_count !== null ? String(company.employee_count) : '',
        video_url: company.video_url ?? '',
        logo: company.logo ?? '',
        cover_image: company.cover_image ?? '',
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
          .maybeSingle(),
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
          ((highlights as any[] | null)?.map((h: any) => ({
            icon: h.icon ?? 'growth',
            title: h.title ?? '',
            body: h.body ?? '',
          })) as HighlightFormItem[]) ??
          [{ icon: 'growth', title: '', body: '' }],
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
      highlights: [
        ...prev.highlights,
        { icon: 'growth', title: '', body: '' },
      ],
    }))
  }

  const handleChangeHighlight = (index: number, key: keyof HighlightFormItem, value: string) => {
    setForm((prev) => {
      const list = [...prev.highlights]
      list[index] = { ...list[index], [key]: value }
      return { ...prev, highlights: list }
    })
  }

  // 行削除（文字列配列用）
  const handleRemoveArray = (key: keyof CompanyForm, index: number) => {
    setForm((prev) => {
      const arr = [...(prev[key] as string[])]
      arr.splice(index, 1)
      return { ...prev, [key]: arr.length ? arr : [''] }
    })
  }

  // ハイライト行削除
  const handleRemoveHighlight = (index: number) => {
    setForm((prev) => {
      const list = [...prev.highlights]
      list.splice(index, 1)
      return {
        ...prev,
        highlights: list.length
          ? list
          : [{ icon: 'growth', title: '', body: '' }],
      }
    })
  }

  // --- ロゴアップロード ---
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)

    // 画像は正方形推奨だが、ここではバリデーションせずアップロードのみ行う
    const timestamp = Date.now()
    const fileExt   = file.name.split('.').pop()
    const filePath  = `logos/${timestamp}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert(`アップロードに失敗しました: ${uploadError.message}`)
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath)

    if (data?.publicUrl) {
      setForm((prev) => ({ ...prev, logo: data.publicUrl }))
    }

    setUploadingLogo(false)
  }

  // カバー画像アップロード
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)

    const timestamp = Date.now()
    const fileExt   = file.name.split('.').pop()
    const filePath  = `covers/${timestamp}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('company-covers')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert(`アップロードに失敗しました: ${uploadError.message}`)
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage
      .from('company-covers')
      .getPublicUrl(filePath)

    if (data?.publicUrl) {
      setForm((prev) => ({ ...prev, cover_image: data.publicUrl }))
    }

    setUploadingLogo(false)
  }

  // 送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    // --- YouTube URL validation ---
    if (
      form.video_url.trim() !== '' &&
      !YOUTUBE_REGEX.test(form.video_url.trim())
    ) {
      setError('紹介動画 URL は YouTube のみ許可されています');
      return;
    }
    setSaving(true)

    // --- 基本情報更新 ---
    const updatePayload: Partial<CompaniesRow> = {
      tagline       : form.tagline.trim() || null,
      representative: form.representative.trim() || null,
      founded_year  : form.founded_on ? Number(form.founded_on.slice(0, 4)) : null,
      capital_jpy   : form.capital_jpy ? Number(form.capital_jpy) : null,
      revenue_jpy   : form.revenue_jpy ? Number(form.revenue_jpy) : null,
      location      : form.headquarters.trim() || null,
      industry      : form.industry.trim() || null,
      employee_count: form.employee_count ? Number(form.employee_count) : null,
      video_url     : form.video_url.trim() || null,
      logo          : form.logo.trim() || null,
      cover_image   : form.cover_image.trim() || null,
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

    // industry の前後空白・重複コンマを正規化
    form.industry = form.industry
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(',');

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

    // --- ハイライト upsert ---
    // まず既存を削除し、エラーを捕捉
    const { error: deleteHlErr } = await supabase
      .from('company_highlights')
      .delete()
      .eq('company_id', companyId);

    if (deleteHlErr) {
      setError(`ハイライト削除に失敗しました: ${deleteHlErr.message}`);
      setSaving(false);
      return;
    }

    // 1 行でも内容が入っていれば保存対象とする
    const hlPayload = form.highlights
      .filter(
        (h) =>
          h.icon.trim() !== '' ||
          h.title.trim() !== '' ||
          h.body.trim() !== '',
      )
      .map((h, i) => ({
        company_id: companyId,
        ordinal: i,
        icon: h.icon,
        title: h.title,
        body: h.body,
      }));

    if (hlPayload.length) {
      const { error: insertHlErr } = await supabase
        .from('company_highlights')
        .insert(hlPayload);

      if (insertHlErr) {
        setError(`ハイライト保存に失敗しました: ${insertHlErr.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false)
    router.refresh()
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p className="text-destructive">{error}</p>

  const toggleIndustry = (label: string) => {
    setForm((prev) => {
      const selected = prev.industry
        ? prev.industry.split(',').filter((s) => s !== '')
        : [];
      if (selected.includes(label)) {
        // remove
        const next = selected.filter((i) => i !== label);
        return { ...prev, industry: next.join(',') };
      } else {
        // add
        return { ...prev, industry: [...selected, label].join(',') };
      }
    });
  };

  const isIndustryChecked = (label: string) =>
    form.industry.split(',').includes(label);

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">会社情報の編集</h1>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ロゴ + キャッチコピー */}
        <div className="flex flex-col gap-6">
          {/* 会社ロゴ */}
          <div>
            <Label htmlFor="logoFileTrigger">会社ロゴ <span className="text-xs text-muted-foreground">(正方形推奨)</span></Label>
            <div className="mt-2 flex flex-col gap-3 items-start">
              {/* プレビューを最上部に表示 */}
              {form.logo && (
                <img
                  src={form.logo}
                  alt="Company Logo Preview"
                  className="h-24 w-24 object-contain border rounded-md"
                />
              )}

              {/* hidden file input */}
              <input
                type="file"
                accept="image/*"
                id="logoFileTrigger"
                className="hidden"
                onChange={handleLogoFileChange}
              />

              {/* アップロードボタン */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => document.getElementById('logoFileTrigger')?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? 'アップロード中…' : '画像をアップロード'}
              </Button>
            </div>
          </div>

          {/* カバー画像 */}
          <div>
            <Label htmlFor="coverFileTrigger">カバー画像 <span className="text-xs text-muted-foreground">(横長推奨)</span></Label>
            <div className="mt-2 flex flex-col gap-3 items-start">
              {form.cover_image && (
                <img
                  src={form.cover_image}
                  alt="Cover Preview"
                  className="h-32 w-full object-cover border rounded-md"
                />
              )}
              <input
                type="file"
                accept="image/*"
                id="coverFileTrigger"
                className="hidden"
                onChange={handleCoverFileChange}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => document.getElementById('coverFileTrigger')?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? 'アップロード中…' : 'カバー画像をアップロード'}
              </Button>
            </div>
          </div>

          {/* キャッチコピー */}
          <div>
            <Label htmlFor="tagline">キャッチコピー</Label>
            <Input
              id="tagline"
              className="w-full"
              placeholder="例: 次世代を創る挑戦者募集"
              value={form.tagline}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tagline: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="representative">代表者</Label>
            <Input
              id="representative"
              placeholder="例:山田 太郎"
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
              placeholder="例: 2018-04-01"
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
            <Label htmlFor="capital_jpy">資本金 (万円)</Label>
            <Input
              id="capital_jpy"
              type="number"
              placeholder="例: 10000"
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
            <Label htmlFor="revenue_jpy">売上高 (万円)</Label>
            <Input
              id="revenue_jpy"
              type="number"
              placeholder="例: 5000"
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
          <Label htmlFor="headquarters">所在地</Label>
          <Input
            id="headquarters"
            placeholder="例: 東京都渋谷区○○ 1-2-3"
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
          <Label className="block mb-2">業種 <span className="text-xs text-muted-foreground">(複数選択可)</span></Label>
          <div className="grid grid-cols-3 gap-y-2">
            {INDUSTRY_OPTIONS.map((label) => (
              <label key={label} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isIndustryChecked(label)}
                  onCheckedChange={() => toggleIndustry(label)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="employee_count">従業員数</Label>
          <Input
            id="employee_count"
            type="number"
            placeholder="例: 150"
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
          <Label htmlFor="video_url">紹介動画 URL </Label>
          <Input
            id="video_url"
            placeholder="例: https://www.youtube.com/embed/abcdefghij"
            value={form.video_url}
            pattern="https?://(www\.)?(youtube\.com|youtu\.be)/.*"
            title="YouTube の URL を入力してください"
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
            <div key={idx} className="mt-2 flex items-start gap-2">
              <Textarea
                className="flex-1"
                value={p}
                placeholder={`例: 私たちは多様性を尊重し挑戦を続けます (${idx + 1})`}
                onChange={(e) =>
                  handleChangeArray('philosophy', idx, e.target.value)
                }
              />
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleRemoveArray('philosophy', idx)}
              >
                削除
              </Button>
            </div>
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
            <div key={idx} className="mt-2 flex gap-2">
              <Input
                className="flex-1"
                value={a}
                placeholder={`例: SaaS プロダクト開発`}
                onChange={(e) =>
                  handleChangeArray('businessAreas', idx, e.target.value)
                }
              />
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleRemoveArray('businessAreas', idx)}
              >
                削除
              </Button>
            </div>
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
            placeholder="例: 私たちと共に未来を創りませんか？"
            value={form.recruitMessage}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                recruitMessage: e.target.value,
              }))
            }
          />
        </div>

        {/* 企業の魅力 */}
        <div>
          <Label className="text-lg font-semibold">企業の魅力</Label>

          {form.highlights.map((h, idx) => (
            <div
              key={idx}
              className="relative mt-4 rounded-lg border bg-muted/40 p-5 space-y-3"
            >
              {/* ❶ アイコン選択 */}
              <div>
                <Label htmlFor={`icon-${idx}`}>アイコン</Label>
                <select
                  id={`icon-${idx}`}
                  className="w-full rounded-md border px-3 py-2"
                  value={h.icon}
                  onChange={(e) =>
                    handleChangeHighlight(idx, 'icon', e.target.value)
                  }
                >
                <option value="growth">🏃‍♂️ 成長（growth）</option>
                <option value="training">📚 研修（training）</option>
                <option value="diversified">🌐 多様性（diversified）</option>
                <option value="innovation">💡 イノベーション（innovation）</option>
                <option value="worklife">⚖️ ワークライフバランス（worklife）</option>
                <option value="benefits">🎁 福利厚生（benefits）</option>
                <option value="sustainability">🌱 サステナビリティ（sustainability）</option>
                <option value="remote">🏠 リモートワーク（remote）</option>
                <option value="culture">🤝 企業文化（culture）</option>
                </select>
                <small className="text-xs text-muted-foreground">
                  アイコンを選ぶと一覧表示の絵文字が変わります
                </small>
              </div>

              {/* ❷ タイトル */}
              <div>
                <Label htmlFor={`title-${idx}`}>タイトル</Label>
                <Input
                  id={`title-${idx}`}
                  placeholder="例: 若手でも挑戦できる環境"
                  value={h.title}
                  onChange={(e) =>
                    handleChangeHighlight(idx, 'title', e.target.value)
                  }
                />
              </div>

              {/* ❸ 説明 */}
              <div>
                <Label htmlFor={`body-${idx}`}>説明</Label>
                <Textarea
                  id={`body-${idx}`}
                  placeholder="具体的なエピソードや制度などを記載"
                  value={h.body}
                  onChange={(e) =>
                    handleChangeHighlight(idx, 'body', e.target.value)
                  }
                />
              </div>

              {/* ❺ 削除ボタン */}
              <button
                type="button"
                onClick={() => handleRemoveHighlight(idx)}
                className="absolute right-2 top-2 rounded-md p-1 hover:bg-red-50"
              >
                <span className="text-destructive text-xl">✕</span>
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={handleAddHighlight}
          >
            行を追加
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存する'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreviewModal(true)}
          >
            未保存のままプレビュー
          </Button>
          {companyId && (
            <Link href={`/companies/${companyId}`} target="_blank">
              <Button type="button" variant="outline">
                公開ページで確認（別タブ）
              </Button>
            </Link>
          )}
        </div>

        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>ドラフトプレビュー（未保存）</DialogTitle>
            </DialogHeader>

            <div id="draft-preview" className="rounded-none bg-transparent text-card-foreground">
              {/* ------- Hero Section ------- */}
              <div className={`relative h-[300px] md:h-[400px] w-full overflow-hidden ${form.cover_image ? "" : "bg-red-600"}`}>
                {form.cover_image ? (
                  <Image src={form.cover_image} alt="cover" fill className="object-cover" />
                ) : (
                  <Image src="/placeholder.svg" alt="cover" fill className="object-cover opacity-90" />
                )}
                {!form.cover_image && (
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/90 to-red-600/50" />
                )}
              </div>

              {/* ------- Main Container ------- */}
              <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">

                  {/* ------- Left: Company Info ------- */}
                  <div className="w-full lg:w-2/3">
                    {/* Header Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-shrink-0">
                          <div className="rounded-md border overflow-hidden w-[80px] h-[80px] grid place-items-center bg-white">
                            {form.logo ? (
                              <Image src={form.logo} alt="logo" width={80} height={80} className="object-contain" />
                            ) : (
                              <Image src="/placeholder.svg?height=80&width=80" alt="logo" width={80} height={80} />
                            )}
                          </div>
                        </div>
                        <div className="flex-grow">
                          {form.industry && (
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{form.industry}</Badge>
                            </div>
                          )}
                          <h1 className="text-2xl font-bold">企業名（プレビュー）</h1>
                          {form.tagline && (
                            <p className="text-sm text-gray-600 mt-1">{form.tagline}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="overview" className="mb-6">
                      <div className="bg-white rounded-xl shadow-sm">
                        <TabsList className="w-full justify-start rounded-none border-b p-0">
                          <TabsTrigger
                            value="overview"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                          >
                            企業概要
                          </TabsTrigger>
                          <TabsTrigger
                            value="jobs"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                          >
                            求人情報
                          </TabsTrigger>
                        </TabsList>

                        {/* Overview */}
                        <TabsContent value="overview" className="p-6">
                          {/* Philosophy */}
                          {form.philosophy.filter(p=>p.trim()!=="").length > 0 && (
                            <div className="mb-8">
                              <h2 className="text-xl font-bold mb-4">企業理念</h2>
                              <div className="bg-gray-50 p-6 rounded-lg">
                                {form.philosophy.filter(p=>p.trim()!="").map((paragraph, index) => (
                                  <p key={index} className="mb-3 last:mb-0 text-gray-700">{paragraph}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recruit Message */}
                          {form.recruitMessage && (
                            <div className="mb-8">
                              <h2 className="text-xl font-bold mb-4">採用メッセージ</h2>
                              <Card className="p-6 border-l-4 border-l-red-600">
                                <p className="text-gray-700 whitespace-pre-wrap">{form.recruitMessage}</p>
                              </Card>
                            </div>
                          )}

                          {/* Company table */}
                          <div>
                            <h2 className="text-xl font-bold mb-4">企業情報</h2>
                            <div className="bg-white border rounded-lg overflow-hidden">
                              <table className="w-full">
                                <tbody className="divide-y">
                                  {form.industry && (
                                    <tr className="hover:bg-gray-50">
                                      <th className="py-4 px-6 text-left bg-gray-50 w-1/3">業種</th>
                                      <td className="py-4 px-6">{form.industry}</td>
                                    </tr>
                                  )}
                                  {form.representative && (
                                    <tr className="hover:bg-gray-50">
                                      <th className="py-4 px-6 text-left bg-gray-50">代表者</th>
                                      <td className="py-4 px-6">{form.representative}</td>
                                    </tr>
                                  )}
                                  {form.headquarters && (
                                    <tr className="hover:bg-gray-50">
                                      <th className="py-4 px-6 text-left bg-gray-50">所在地</th>
                                      <td className="py-4 px-6">{form.headquarters}</td>
                                    </tr>
                                  )}
                                  {form.founded_on && (
                                    <tr className="hover:bg-gray-50">
                                      <th className="py-4 px-6 text-left bg-gray-50">設立日</th>
                                      <td className="py-4 px-6">{form.founded_on}</td>
                                    </tr>
                                  )}
                                  {form.capital_jpy && (
                                    <tr className="hover:bg-gray-50">
                                      <th className="py-4 px-6 text-left bg-gray-50">資本金</th>
                                      <td className="py-4 px-6">{Number(form.capital_jpy).toLocaleString()} 万円</td>
                                    </tr>
                                  )}
                                  {form.revenue_jpy && (
                                    <tr className="hover:bg-gray-50">
                                      <th className="py-4 px-6 text-left bg-gray-50">売上高</th>
                                      <td className="py-4 px-6">{Number(form.revenue_jpy).toLocaleString()} 万円</td>
                                    </tr>
                                  )}
                                  {form.employee_count && (
                                    <tr className="hover:bg-gray-50">
                                      <th className="py-4 px-6 text-left bg-gray-50">従業員数</th>
                                      <td className="py-4 px-6">{form.employee_count} 名</td>
                                    </tr>
                                  )}
                                  {form.businessAreas.filter(a=>a.trim()!="").length>0 && (
                                    <tr className="hover:bg-gray-50">
                                      <th className="py-4 px-6 text-left bg-gray-50">事業内容</th>
                                      <td className="py-4 px-6">
                                        <ul className="list-disc pl-5 space-y-1">
                                          {form.businessAreas.filter(a=>a.trim()!="").map((area, index) => (
                                            <li key={index}>{area}</li>
                                          ))}
                                        </ul>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </TabsContent>

                        {/* Jobs Tab (from positions) */}
                        <TabsContent value="jobs" className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">求人情報</h2>
                          </div>
                          {form.positions.filter(p=>p.trim()!="").length === 0 ? (
                            <p className="text-sm text-gray-500">現在公開中の求人はありません。</p>
                          ) : (
                            <div className="space-y-3">
                              {form.positions.filter(p=>p.trim()!="").map((pos, idx) => (
                                <Card key={idx} className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800">募集</Badge>
                                    <span className="font-semibold">{pos}</span>
                                  </div>
                                  <Button variant="outline" size="sm">詳細</Button>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>

                  {/* ------- Right: Sidebar ------- */}
                  <div className="w-full lg:w-1/3 space-y-6">
                    {/* Highlights */}
                    <Card className="p-6">
                      <h2 className="text-lg font-bold mb-4">企業の魅力</h2>
                      {form.highlights.filter(h=> (h.icon||h.title||h.body).trim()!=="").length === 0 ? (
                        <p className="text-sm text-gray-500">魅力情報はまだ登録されていません。</p>
                      ) : (
                        <div className="space-y-4">
                          {form.highlights
                            .filter(h=> (h.icon||h.title||h.body).trim()!=="")
                            .map((hl, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <div className="bg-red-100 p-2 rounded-full text-red-600">
                                  {hl.icon === 'training' ? (
                                    <Users size={20} />
                                  ) : hl.icon === 'diversified' ? (
                                    <Building2 size={20} />
                                  ) : (
                                    <Star size={20} />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold">{hl.title || '（タイトル未入力）'}</h3>
                                  {hl.body && <p className="text-sm text-gray-600 whitespace-pre-line">{hl.body}</p>}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </Card>

                    {/* Video */}
                    {YOUTUBE_REGEX.test(form.video_url.trim()) && toYouTubeEmbedUrl(form.video_url.trim()) && (
                      <Card className="overflow-hidden">
                        <div className="aspect-video relative">
                          <iframe
                            src={toYouTubeEmbedUrl(form.video_url.trim())}
                            className="absolute inset-0 w-full h-full"
                            frameBorder={0}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold">企業紹介ムービー</h3>
                          <p className="text-sm text-gray-600">動画で企業の雰囲気をご覧ください</p>
                        </div>
                      </Card>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </form>
    </div>
  )
}