"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type Skill = {
  id: string
  name: string
  level: number // 0-100
  category: string
}

type SkillAssessmentProps = {
  skills: Skill[]
  showCategories?: boolean
}

export function SkillAssessment({ skills, showCategories = true }: SkillAssessmentProps) {
  // Group skills by category if showCategories is true
  const groupedSkills = React.useMemo(() => {
    if (!showCategories) return { "All Skills": skills }

    return skills.reduce(
      (acc, skill) => {
        if (!acc[skill.category]) {
          acc[skill.category] = []
        }
        acc[skill.category].push(skill)
        return acc
      },
      {} as Record<string, Skill[]>,
    )
  }, [skills, showCategories])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>スキル評価</CardTitle>
      </CardHeader>
      <CardContent>
        {Object.entries(groupedSkills).map(([category, categorySkills]) => (
          <div key={category} className="mb-6 last:mb-0">
            {showCategories && <h3 className="text-lg font-medium mb-2">{category}</h3>}
            <div className="space-y-4">
              {categorySkills.map((skill) => (
                <div key={skill.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{skill.name}</span>
                    <span className="text-xs text-muted-foreground">{skill.level}%</span>
                  </div>
                  <Progress value={skill.level} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
