// Mock badge data
export const badgeData = [
  {
    id: "top-scorer",
    name: "トップスコアラー",
    description: "いずれかのチャレンジで1位を獲得",
    icon: "🥇",
    variant: "gold" as const,
    earned: true,
    earnedDate: "2025年3月15日",
  },
  {
    id: "top-10-percent",
    name: "トップ10%",
    description: "いずれかのチャレンジで上位10%にランクイン",
    icon: "🥈",
    variant: "silver" as const,
    earned: true,
    earnedDate: "2025年4月10日",
  },
  {
    id: "consistent-submitter",
    name: "継続提出者",
    description: "3ヶ月連続でチャレンジに回答を提出",
    icon: "📅",
    variant: "bronze" as const,
    earned: true,
    earnedDate: "2025年5月1日",
  },
  {
    id: "high-performer",
    name: "ハイパフォーマー",
    description: "いずれかのチャレンジで90点以上を獲得",
    icon: "🔥",
    variant: "blue" as const,
    earned: true,
    earnedDate: "2025年2月28日",
  },
  {
    id: "first-challenge",
    name: "ファーストチャレンジ",
    description: "初めてのチャレンジ回答を提出",
    icon: "🚀",
    variant: "green" as const,
    earned: true,
    earnedDate: "2025年1月15日",
  },
  {
    id: "reflection-master",
    name: "リフレクションマスター",
    description: "5つ星のピアレビューを獲得",
    icon: "🧠",
    variant: "default" as const,
    earned: false,
    progress: 3,
    maxProgress: 5,
  },
  {
    id: "perfect-score",
    name: "パーフェクトスコア",
    description: "いずれかのチャレンジで100点満点を獲得",
    icon: "💯",
    variant: "gold" as const,
    earned: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "feedback-king",
    name: "フィードバックキング",
    description: "10件以上の有益なフィードバックを提供",
    icon: "👑",
    variant: "silver" as const,
    earned: false,
    progress: 4,
    maxProgress: 10,
  },
]

// Get badges for a specific user (in a real app, this would be fetched from the backend)
export function getUserBadges(userId = "current-user") {
  // In a real app, this would filter based on the user ID
  return badgeData
}

// Get only earned badges
export function getEarnedBadges(userId = "current-user") {
  return getUserBadges(userId).filter((badge) => badge.earned)
}

// Get badge by ID
export function getBadgeById(badgeId: string) {
  return badgeData.find((badge) => badge.id === badgeId)
}

// Check if user has a specific badge
export function userHasBadge(badgeId: string, userId = "current-user") {
  const badge = getBadgeById(badgeId)
  return badge?.earned || false
}
