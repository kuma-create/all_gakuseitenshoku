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
  })
  const [loading, setLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
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
          'id, tagline, representative, founded_year, capital_jpy, revenue_jpy, location, industry, employee_count, video_url, logo',
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
        founded_on: company.founded_year ? `${company.founded_year}-01-01` : '',
        capital_jpy: company.capital_jpy !== null ? String(company.capital_jpy) : '',
        revenue_jpy: company.revenue_jpy !== null ? String(company.revenue_jpy) : '',
        headquarters: company.location ?? '',
        industry: company.industry ?? '',
        employee_count: company.employee_count !== null ? String(company.employee_count) : '',
        video_url: company.video_url ?? '',
        logo: company.logo ?? '',
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

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存する'}
          </Button>
          {companyId && (
            <Link href={`/companies/${companyId}`} target="_blank">
              <Button type="button" variant="outline">
                プレビュー
              </Button>
            </Link>
          )}
        </div>
      </form>
    </div>
  )
}