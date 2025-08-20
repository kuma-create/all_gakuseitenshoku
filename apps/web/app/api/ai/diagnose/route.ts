// app/api/ipo/diagnose/route.ts
import { NextRequest, NextResponse } from "next/server";

type SelectionStatus = { stage?: string|null; stage_order?: number|null; active_applications?: number|null; };
type ClarityInfo     = { clarity_score?: number|null; desired_industries?: string[]|null; desired_roles?: string[]|null; };
type AgeGrade        = { age?: number|null; grade?: string|null };

const clamp = (v:number,min=0,max=100)=>Math.max(min,Math.min(max,v));
const lenScore=(t:string)=>{const w=t.split(/\s+/).filter(Boolean).length;return w<150?20:w<300?40:w<600?65:w<1200?85:95;}
const kw=(t:string,ks:string[],w=1)=>{const s=t.toLowerCase();let c=0;for(const k of ks){const m=s.match(new RegExp(`\\b${k.toLowerCase()}\\b`,'g'));c+=m?m.length:0;}return c*w;}

function baseline(text:string){
  const comm = kw(text,['client','stakeholder','presentation','negotiation','facilitated','cross-functional','collaboration','customer','mentored','coached','顧客','クライアント','関係者','調整','交渉','提案','プレゼン','発表','協業','連携','顧客折衝','メンター','指導','支援','営業'],8)+lenScore(text)*0.3;
  const logic= kw(text,['analysis','hypothesis','data','kpi','roi','experiment','ab test','cohort','segmentation','model','optimize','sql','python','分析','仮説','データ','指標','検証','実験','abテスト','ABテスト','セグメント','モデル','最適化','SQL','Python','KPI','ROI'],9)+kw(text,['because','therefore','so that','なぜ','だから','そのため'],3);
  const lead = kw(text,['led','managed','owner','launched','initiated','pm','product manager','scrum','okr','kpi','team of','hired','trained','リード','主導','マネジ','管理','責任者','立ち上げ','推進','PM','プロダクトマネージャ','スクラム','OKR','目標','チーム','採用','育成','教育'],10);
  const fit  = kw(text,['mission','vision','value','culture','customer obsession','ownership','bias for action','learn','growth','teamwork','integrity','ミッション','ビジョン','バリュー','カルチャー','文化','顧客志向','オーナーシップ','行動','学習','成長','チームワーク','誠実'],6);
  const vita = kw(text,['volunteer','hackathon','side project','startup','award','certified','certification','toefl','ielts','toeic','gpa','athletics','club','entrepreneur','ボランティア','ハッカソン','副業','スタートアップ','受賞','表彰','資格','TOEIC','TOEFL','IELTS','GPA','部活','起業'],7);
  const numbers = ((text.match(/\b[0-9]+(?:\.[0-9]+)?%?/g)||[]).length + (text.match(/[０-９]+(?:．[０-９]+)?％/g)||[]).length)*2.5;
  const max=140;
  const breakdown={
    Communication: clamp(((comm+numbers)/max)*100),
    Logic:         clamp(((logic+numbers)/max)*100),
    Leadership:    clamp(((lead+numbers)/max)*100),
    Fit:           clamp((fit/max)*100),
    Vitality:      clamp((vita/max)*100),
  };
  const overall=Math.round(breakdown.Logic*0.28+breakdown.Communication*0.25+breakdown.Leadership*0.22+breakdown.Fit*0.15+breakdown.Vitality*0.10);
  return { overall, breakdown };
}

function makeGuidance(overall:number, br:Record<string,number>, sel:SelectionStatus, clr:ClarityInfo, ag:AgeGrade){
  const strengths   = Object.entries(br).filter(([,v])=>v>=70).map(([k])=>`${k} が強みです`);
  const improvements= Object.entries(br).filter(([,v])=>v<50 ).map(([k])=>`${k} を伸ばす余地があります（定量成果・役割の明記を追加）`);
  const recs:string[]=[];
  if((sel.stage_order??0)<3) recs.push('今週は書類3社提出（職務要約200字＋成果3点）を目標にしましょう');
  else if((sel.stage_order??0)<5) recs.push('一次/二次面接の深掘り対策：想定問答を5題、録音して自己レビュー');
  else recs.push('最終選考：志望動機をストーリー（課題→行動→成果→学び）で再構成');
  if((clr.clarity_score??0)<60) recs.push('志望業界/職種の比較表（2×3）を作成し、優先順位を明確化');
  else recs.push('志望理由に実体験と数値を入れて、説得力を強化');
  if((ag.grade??'').toString().match(/4|四|senior/i)) recs.push('卒業年度が近いので、週2社のOB訪問と模擬面接を追加');
  return { strengths, improvements, recommendations: recs };
}

export async function POST(req:NextRequest){
  try{
    const { resumeText='', selection={}, clarity={}, ageOrGrade={} } = await req.json();

    // 1) OpenAI（任意）。OPENAI_API_KEY があれば試す → 失敗時はローカルへフォールバック
    if(process.env.OPENAI_API_KEY){
      try{
        const resp = await fetch('https://api.openai.com/v1/chat/completions',{
          method:'POST',
          headers:{ 'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' },
          body: JSON.stringify({
            model:'gpt-4o-mini',
            messages:[
              { role:'system', content:'You are a career coach for Japanese university students. Rate 0-100 overall and on 5 axes (Communication, Logic, Leadership, Fit, Vitality). Also give 3-6 concrete next actions for the coming week. Respond in JSON.'},
              { role:'user', content: JSON.stringify({ resumeText, selection, clarity, ageOrGrade }) }
            ],
            response_format:{ type:'json_object' }
          })
        });
        if(resp.ok){
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content;
          if(content){
            const j = JSON.parse(content);
            const base = baseline(resumeText);
            const overall = clamp(Number(j.overall) || base.overall, 0, 100);
            const breakdown = j.breakdown ?? base.breakdown;
            const insights  = j.insights  ?? makeGuidance(overall, breakdown, selection, clarity, ageOrGrade);
            return NextResponse.json({ overall, breakdown, insights });
          }
        }
      }catch{/* fallthrough */}
    }

    // 2) ローカル（確実に動く）
    const base = baseline(resumeText);
    const modifier = (clarity.clarity_score??50)*0.05 + (selection.stage_order??0)*1.5;
    const overall = clamp(Math.round(base.overall + modifier),0,100);
    const insights = makeGuidance(overall, base.breakdown, selection, clarity, ageOrGrade);
    return NextResponse.json({ overall, breakdown: base.breakdown, insights });
  }catch(e:any){
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status:500 });
  }
}