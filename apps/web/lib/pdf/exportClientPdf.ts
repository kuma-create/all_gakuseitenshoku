// lib/pdf/exportClientPdf.ts
import html2pdf from "html2pdf.js";

/**
 * A4 縦・日本語フォント対応で PDF に変換して保存
 * @param el 対象 Element
 */
export function exportClientPdf(el: HTMLElement, filename: string = "resume.pdf") {
  html2pdf()
    .set({
      filename: "resume.pdf",
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      html2canvas: {
        scale: window.devicePixelRatio < 2 ? 2 : window.devicePixelRatio, // Retina 高解像度対応
        useCORS: true,  // 外部画像を描画する場合
        allowTaint: true,
      },
    })
    .from(el)
    .save(filename);
}