import axios from "axios";
import * as XLSX from "xlsx";
import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * 最新年度の全国大学一覧ページ。
 * 年度が変わったら末尾の数字だけ更新 (mext_00026 → mext_00027 …) すれば OK。
 */
const LIST_PAGE =
  "https://www.mext.go.jp/a_menu/koutou/ichiran/mext_00026.html";

async function main() {
  console.log("📥 Fetch list page:", LIST_PAGE);
  const html = (await axios.get(LIST_PAGE)).data;
  const $ = cheerio.load(html);

  /** 1) .xlsx のリンクを全取得（国立・公立・私立など複数枚ある） */
  const excelUrls = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.endsWith(".xlsx")) {
      const absUrl = href.startsWith("http")
        ? href
        : new URL(href, LIST_PAGE).href;
      excelUrls.push(absUrl);
    }
  });
  if (!excelUrls.length) {
    throw new Error("Excel links not found – ページ構造が変わった可能性があります。");
  }
  console.log(`🔗 Found ${excelUrls.length} excel files.`);

  /** 2) 各 Excel から「大学名」列のみ抽出 */
  const allNames = new Set();
  for (const url of excelUrls) {
    try {
      console.log("↳ Download:", url);
      const buf = (await axios.get(url, { responseType: "arraybuffer" })).data;
      const wb = XLSX.read(buf, { type: "buffer" });

      /* --- iterate over every sheet (国立・公立・私立ファイルは複数シート構成) --- */
      wb.SheetNames.forEach((sheetName) => {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rows.length) return;

        /* 上 5 行を平坦化してヘッダ候補にする（私立ファイルは 3 行ヘッダ等が存在） */
        const header = rows.slice(0, 5).flat();

        /* 「大学名」「学校名」「学校の名称」などを許容 */
        const colIdx = header.findIndex((h) =>
          ["大学名", "学校名", "学校の名称"].some((key) =>
            String(h).includes(key)
          )
        );
        if (colIdx === -1) {
          /* Fallback ── 列名が取れないシート（主に私立大学一覧）。
             行頭セルが「○○大学」を含むものを大学名とみなす。 */
          rows.forEach((row, rIdx) => {
            if (rIdx < 3) return; // ヘッダと思しき行はスキップ
            const cell = row[0];
            if (typeof cell === "string" && cell.includes("大学")) {
              allNames.add(cell.trim());
            }
          });
          return;
        }

        /* データは 2 行目以降にあることが多いので rows.slice(2) */
        rows.slice(2).forEach((row) => {
          const name = row[colIdx];
          if (name) allNames.add(String(name).trim());
        });
      });
    } catch (e) {
      console.warn("❌  Failed to process", url, e?.message ?? e);
    }
  }

  /** 3) 重複除去・フィルタ・ソートして JSON 出力 */
  const list = [...allNames]
    .filter((name) => {
      // 数値のみの行（学校コード）は除外
      if (/^\d+$/.test(name)) return false;
      // 「大学」または「学院」を含む名称のみ採用
      return /大学|学院/.test(name);
    })
    .sort((a, b) => a.localeCompare(b, "ja"));
  const out = path.join("public", "universities_jp.json");
  await fs.writeFile(out, JSON.stringify(list, null, 2), "utf8");
  console.log(`✅ Wrote ${list.length} universities → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});