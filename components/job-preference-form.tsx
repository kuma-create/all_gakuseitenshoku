"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MultiSelect } from "@/components/multi-select"

type Option = {
  value: string
  label: string
}

type JobPreferenceFormProps = {
  industries: Option[]
  locations: Option[]
  positions: Option[]
  selectedIndustries: string[]
  selectedLocations: string[]
  selectedPositions: string[]
  onIndustriesChange: (values: string[]) => void
  onLocationsChange: (values: string[]) => void
  onPositionsChange: (values: string[]) => void
  onSubmit: () => void
  isLoading?: boolean
}

export function JobPreferenceForm({
  industries,
  locations,
  positions,
  selectedIndustries,
  selectedLocations,
  selectedPositions,
  onIndustriesChange,
  onLocationsChange,
  onPositionsChange,
  onSubmit,
  isLoading = false,
}: JobPreferenceFormProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>希望条件設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="industries">希望業界</Label>
            <MultiSelect
              id="industries"
              options={industries}
              selected={selectedIndustries}
              onChange={onIndustriesChange}
              placeholder="業界を選択してください"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locations">希望勤務地</Label>
            <MultiSelect
              id="locations"
              options={locations}
              selected={selectedLocations}
              onChange={onLocationsChange}
              placeholder="勤務地を選択してください"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="positions">希望職種</Label>
            <MultiSelect
              id="positions"
              options={positions}
              selected={selectedPositions}
              onChange={onPositionsChange}
              placeholder="職種を選択してください"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "保存中..." : "希望条件を保存"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
