// components/pdf/ResumeTemplate.tsx
import React from "react";

/** ---------- 型定義（必要に応じて共通の types ファイルへ移して OK） ---------- */
export interface BasicInfo {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;      // "2024-04" など
  endDate?: string;       // "2025-02" / undefined = 現在
  isCurrent?: boolean;
  description?: string;
  achievements?: string;  // 改行区切り
}

export interface ResumeTemplateProps {
  basic: BasicInfo;
  workExperiences: WorkExperience[];
  skills?: string[];      // 例: ["React", "TypeScript"]
  educations?: string[];  // 例: ["2021 京都大学 経済学部 卒業"]
  updatedAt?: string;   // ISO string (resumes.updated_at)
}

/** ---------- A4 縦レイアウト本体 ---------- */
export default function ResumeTemplate({
  basic,
  workExperiences,
  skills = [],
  educations = [],
  updatedAt,
}: ResumeTemplateProps & { updatedAt?: string }) {
  const dateObj = updatedAt ? new Date(updatedAt) : new Date();
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");

  return (
    <div
      className="
        mx-auto
        w-[180mm]
        min-h-[257mm]
        px-[15mm] py-[12mm]
        text-[11pt] leading-relaxed
        font-['Noto_Sans_JP','Helvetica','Arial',sans-serif]
        border border-gray-300 rounded
      "
    >
      {/* ==== 1. 書類タイトル ==== */}
      <header className="mb-6">
        <div className="flex justify-between items-start">
          {/* 左: タイトル */}
          <h1 className="text-2xl font-bold tracking-wider">
            職務経歴書
          </h1>

          {/* 右: 日付 & 氏名 */}
          <div className="text-right text-sm leading-snug space-y-[2px]">
            {/* 日付（和暦や西暦は後で JS で埋め込む想定） */}
            <div>
              <span className="inline-block w-8 text-center">{y}</span>年
              <span className="inline-block w-6 text-center">{m}</span>月
              <span className="inline-block w-6 text-center">{d}</span>日
            </div>
            <p className="font-semibold tracking-wider text-base">
              {basic.lastName}　{basic.firstName}
            </p>
          </div>
        </div>

        {/* タイトル下線 */}
        <hr className="mt-1 border-t-[1.5px] border-black" />
      </header>

      {/* ==== 2. 中央見出し（職務経歴） ==== */}
      <section className="mb-4">
        <h2 className="text-center font-semibold tracking-wider">
          職務経歴
        </h2>
        <hr className="mt-2 border-t-[1.5px] border-black" />
      </section>

      {/* ==== 3. 職務経歴詳細 ==== */}
      {workExperiences.map((exp, idx) => (
        <div key={idx} className="break-inside-avoid mb-4">
          {/* 会社名バー */}
          <div className="flex items-center bg-[#d9d9d9] w-full px-3 py-[8px] text-sm leading-tight font-semibold tracking-wider">
            {exp.company}
          </div>

          {/* 期間 & ポジション */}
          <div className="pl-2 pt-1">
            <p className="text-sm">
              {exp.startDate} 〜 {exp.isCurrent ? "現在" : exp.endDate}　
              {exp.position}
            </p>

            {/* 職務内容 */}
            {exp.description && (
              <p className="whitespace-pre-wrap text-sm mt-1">
                {exp.description}
              </p>
            )}

            {/* 実績 */}
            {exp.achievements && (
              <ul className="list-disc pl-5 mt-1 space-y-[2px] text-sm">
                {exp.achievements.split(/[\n\r]+/).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}

      {/* ==== 4. 備考（スキル・学歴） ==== */}
      {skills.length > 0 && (
        <section className="mb-4 break-inside-avoid">
          <h3 className="font-semibold tracking-wider mb-1">スキル</h3>
          <ul className="flex flex-wrap gap-2 text-sm">
            {skills.map((s, i) => (
              <li
                key={i}
                className="bg-gray-100 rounded-full px-3 py-[2px] border border-gray-300"
              >
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {educations.length > 0 && (
        <section className="break-inside-avoid">
          <h3 className="font-semibold tracking-wider mb-1">学歴</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {educations.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}