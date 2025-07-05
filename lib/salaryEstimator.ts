// lib/salaryEstimator.ts
export type SalaryInput = {
    role: string          // "engineer" | "pm" | …
    hours: string         // "0-20" | "20-40" | "40+"
    leadership: string    // "yes" | "no"
    year: string          // "1" | "2" | "3" | "4" | "grad"
  }
  
  export type SalaryResult = {
    minSalary: number
    maxSalary: number
    averageSalary: number
    position: string      // ex. "Junior", "Mid", "Senior"
    factors: string[]     // ex. ["ポートフォリオあり", "リーダー経験あり"]
  }
  
  /**
   * 入力値から推定年収を返すダミー関数
   * 本番では API 呼び出しや機械学習モデルに置き換える前提
   */
  export function estimateSalary(input: SalaryInput): SalaryResult {
    // --- 重み付けロジック（例） ---
    let base = 300        // 最低ライン 300万円
    if (input.role === "pm") base += 100
    if (input.role === "data") base += 150
    if (input.role === "consultant") base += 120   // コンサルタント
    if (input.role === "trading") base += 80       // 商社
    // "other" は追加加算なし
    if (input.hours === "20-40") base += 30
    if (input.hours === "40+") base += 60
    if (input.leadership === "yes") base += 40
    if (input.year === "3") base += 20
    if (input.year === "4" || input.year === "grad") base += 40
  
    const minSalary = base
    const maxSalary = base + 80
    const averageSalary = Math.round((minSalary + maxSalary) / 2)
  
    return {
      minSalary,
      maxSalary,
      averageSalary,
      position:
        averageSalary > 550 ? "Senior" : averageSalary > 450 ? "Mid" : "Junior",
      factors: [
        input.leadership === "yes" && "リーダー経験あり",
        input.hours === "40+" && "月80h以上の稼働",
      ].filter(Boolean) as string[],
    }
  }