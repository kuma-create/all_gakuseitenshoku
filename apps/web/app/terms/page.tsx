import path from "node:path";
import fs from "node:fs/promises";

// 置き場所: apps/web/public/terms/ 配下にPDFやExcel等を置くと自動で一覧化されます
// 例) public/terms/01_利用規約_学生向け.pdf など

function formatBytes(bytes: number) {
  if (bytes === 0) return "0B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"]; 
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value % 1 === 0 ? value : value.toFixed(1)}${sizes[i]}`;
}

async function listTermFiles() {
  // Try multiple candidates because process.cwd() can be repo root or apps/web
  const candidates = [
    path.join(process.cwd(), "public/terms"),
    path.join(process.cwd(), "apps/web/public/terms"),
  ];

  let dir: string | null = null;
  for (const c of candidates) {
    try {
      await fs.access(c);
      dir = c;
      break;
    } catch (_) {
      // continue
    }
  }

  if (!dir) {
    return [] as { name: string; size: number; href: string }[];
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .filter((e) => /\.(pdf|docx?|xlsx?|csv|txt)$/i.test(e.name))
        .map(async (e) => {
          const fp = path.join(dir!, e.name);
          const st = await fs.stat(fp);
          return {
            name: e.name,
            size: st.size,
            href: `/terms/${encodeURIComponent(e.name)}`,
          };
        })
    );

    files.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    return files;
  } catch (e) {
    return [] as { name: string; size: number; href: string }[];
  }
}

export default async function TermsPage() {
  const files = await listTermFiles();

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6">利用規約（ファイル一覧）</h1>

      {files.length === 0 ? (
        <div className="rounded-md border p-4 text-sm text-gray-600">
          <p>
            公開用ファイルが見つかりませんでした。<br />
            <code className="rounded bg-muted px-1 py-0.5">public/terms</code> または
            <code className="rounded bg-muted px-1 py-0.5">apps/web/public/terms</code>
            にPDFやExcel等を配置してください。
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {files.map((f, idx) => {
            const label = f.name
              .replace(/_/g, " ")
              .replace(/\.(pdf|docx?|xlsx?|csv|txt)$/i, "");
            const ext = f.name.split(".").pop()?.toUpperCase();
            return (
              <li key={f.name} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-8 shrink-0">
                  {String(idx + 1).padStart(2, "0")}.
                </span>
                <a
                  href={f.href}
                  download
                  className="underline-offset-2 hover:underline break-all"
                >
                  {label}
                  {ext ? `（${ext}:${formatBytes(f.size)}）` : `（${formatBytes(f.size)}）`}
                </a>
                <a
                  href={f.href}
                  download
                  className="ml-2 rounded bg-emerald-600 px-2.5 py-1 text-xs text-white hover:opacity-90"
                >
                  ダウンロード
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-xs text-gray-500">
        * 表示されているリンクをクリックすると、その場でダウンロードまたはブラウザで閲覧できます。
      </p>
    </main>
  );
}
