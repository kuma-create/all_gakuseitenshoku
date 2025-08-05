// components/pdf/ResumeTemplate.tsx
import React from "react";

/**
 * Minimal definition used inside this template.
 * Keep this in sync with the canonical definition in /app/resume/page.tsx.
 */
export interface WorkExperience {
  company: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  position: string;
  /** 職種 (Job Type) */
  jobType?: string;
  description?: string;
  achievements?: string;
  skills?: string[]; // 追加: 経歴ごとのスキル
  technologies?: string; // フォーム上のカンマ区切り入力
}

interface ResumeTemplateProps {
  basic: {
    lastName: string;
    firstName: string;
    lastNameKana: string;
    firstNameKana: string;
    birthdate: string;
    gender: string;
    email: string;
    phone: string;
    address: string;
  };
  contact: { email: string; phone: string; address: string };
  workExperiences: WorkExperience[];
  educations: string[];
  skills: string[];
  certifications: string[];
  languages: string[];
  frameworks: string[];
  tools: string[];
  pr: {
    title: string;
    content: string;
    strengths: string[];
    motivation: string;
  };
}

/** ---------- A4 縦レイアウト本体 ---------- */
export default function ResumeTemplate({
  basic,
  contact,
  workExperiences,
  educations = [],
  skills = [],
  certifications = [],
  languages = [],
  frameworks = [],
  tools = [],
  pr,
  updatedAt,
}: ResumeTemplateProps & { updatedAt?: string }) {
  const dateObj = updatedAt ? new Date(updatedAt) : new Date();
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");

  return (
    <div
      className="
        mx-auto mt-4 mb-0 flex flex-col
        w-[595px]          /* A4 幅: 210mm ≒ 595px */
        min-h-[1123px]      /* A4 高さ (96dpi) */
        px-6 pt-6 pb-12   /* 左右 24px, 上 24px, 下 48px 余白 */
        text-[10pt] leading-relaxed
        font-['Noto_Sans_JP','Helvetica','Arial',sans-serif]
        border border-gray-300 rounded
      "
    >
      {/* ==== 1. 書類タイトル ==== */}
      <header className="mb-6">
        <div className="flex justify-between items-start">
          {/* 左: タイトル */}
          <h1 className="text-2xl font-bold tracking-wider">職務経歴書</h1>

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
      </header>

      {/* ==== 2. 中央見出し（職務経歴） ==== */}
      <section className="mb-4">
        <h2 className="text-center font-semibold tracking-wider">
          職務経歴
        </h2>
      </section>

      {/* ==== 3. 職務経歴詳細 ==== */}
      {workExperiences.map((exp, idx) => {
        // 両方の入力形式に対応: skills (array) or technologies (comma-separated)
        const skillList =
          (exp.skills && exp.skills.length > 0
            ? exp.skills
            : exp.technologies
            ? exp.technologies
                .split(/[,、\s]+/) // 「,」「、」や空白で分割
                .map((s) => s.trim())
                .filter(Boolean)
            : []) as string[];
        return (
          <div key={idx} className="break-inside-avoid mb-4">
            {/* 会社名バー */}
            <div className="flex items-center bg-[#d9d9d9] w-full px-3 py-[8px] text-sm leading-tight font-semibold tracking-wider">
              {exp.company}
            </div>

            {/* 期間 & ポジション */}
            <div className="pl-2 pt-1">
              {/* 会社名｜在籍期間｜職種 */}
              <p className="text-sm">
                {exp.startDate} 〜 {exp.isCurrent ? "現在" : exp.endDate}｜
                {exp.position}
                {exp.jobType && <>｜{exp.jobType}</>}
              </p>

              {/* ＜業務内容＞ */}
              {exp.description && (
                <>
                  <p className="mt-1 font-semibold text-sm">【業務内容】</p>
                  <p className="whitespace-pre-wrap text-sm">{exp.description}</p>
                </>
              )}

              {/* ＜成果・実績＞ */}
              {exp.achievements && (
                <>
                  <p className="mt-2 font-semibold text-sm">【成果・実績】</p>
                  <ul className="list-none pl-4 mt-1 space-y-[2px] text-sm">
                    {exp.achievements.split(/[\n\r]+/).map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </>
              )}

              {/* ＜スキル＞ */}
              {skillList.length > 0 && (
                <>
                  <p className="mt-2 font-semibold text-sm">【スキル】</p>
                  <p className="text-sm mt-1">
                    {skillList.join(", ")}
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* ==== 4. 備考（スキル・学歴） ==== */}

      {skills.length > 0 && (
        <section className="mb-4 break-inside-avoid">
          <h3 className="font-semibold tracking-wider mb-1">スキル</h3>
          <p className="text-sm">
            {skills.join(", ")}
          </p>
        </section>
      )}

      {educations.length > 0 && (
        <section className="break-inside-avoid">
          <h3 className="font-semibold tracking-wider mb-1">学歴</h3>
          <ul className="list-none pl-4 space-y-1 text-sm">
            {educations.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 資格・検定 */}
      {certifications.length > 0 && (
        <section className="mb-4 break-inside-avoid">
          <h3 className="font-semibold tracking-wider mb-1">資格・検定</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {certifications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 技術スタック */}
      {(languages.length || frameworks.length || tools.length) > 0 && (
        <section className="mb-4 break-inside-avoid">
          <h3 className="font-semibold tracking-wider mb-1">技術スタック</h3>
          <p className="whitespace-pre-wrap text-sm leading-5">
            {languages.length > 0 && `【言語】${languages.join(", ")}\n`}
            {frameworks.length > 0 && `【FW】${frameworks.join(", ")}\n`}
            {tools.length > 0 && `【ツール】${tools.join(", ")}`}
          </p>
        </section>
      )}

      {/* 自己PR */}
      {(pr.title || pr.content || pr.strengths.filter(Boolean).length || pr.motivation) && (
        <section className="break-inside-avoid">
          <h3 className="font-semibold tracking-wider mb-1">自己PR</h3>
          {pr.title && <p className="text-sm font-semibold">{pr.title}</p>}
          {pr.content && (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-5">{pr.content}</p>
          )}
          {pr.strengths.filter(Boolean).length > 0 && (
            <ul className="list-disc pl-5 space-y-1 mt-1 text-sm">
              {pr.strengths.filter(Boolean).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {pr.motivation && (
            <p className="mt-1 text-sm leading-5">
              <span className="font-semibold">志望動機：</span>
              {pr.motivation}
            </p>
          )}
        </section>
      )}
      {/* 右下ロゴ */}
      <footer className="self-end mt-auto mb-4 mr-6 text-xs text-gray-600">
        学生転職
      </footer>
    </div>
  );
}