"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export default function AnalyticsPage() {
  const [chart, setChart] = useState<any[]>([])

  useEffect(()=>{
    (async()=>{
        const { data } = await supabase.from("job_app_count").select("*") // ←集計 View でも OK
      // data: [{ job_title:"◯◯エンジニア", cnt: 5 }, ...]
      setChart(data||[])
    })()
  },[])

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">応募数分析</h1>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chart}>
          <XAxis dataKey="job_title" tick={{ fontSize:12 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="cnt" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
