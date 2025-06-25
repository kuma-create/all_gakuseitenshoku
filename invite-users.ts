// invite-users.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Supabase情報（ここに入力）
const supabaseUrl = 'https://cpinzmlynykyrxdvkshl.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaW56bWx5bnlreXJ4ZHZrc2hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI1MjI1MiwiZXhwIjoyMDYxODI4MjUyfQ.OHu3boXsjqeo7UFgI0o05N0oB9kplIbHHyT3zsfp3gg'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// CSVからメール一覧を読み込む（1列目にemail想定）
const csvFilePath = './emails.csv'
const emails = fs.readFileSync(csvFilePath, 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(email => email.includes('@'))

async function inviteAll() {
  for (const email of emails) {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)
    if (error) {
      console.error(`❌ ${email}: ${error.message}`)
    } else {
      console.log(`✅ 招待送信成功: ${email}`)
    }
  }
}

inviteAll()