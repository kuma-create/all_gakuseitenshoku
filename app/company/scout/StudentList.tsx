"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import clsx from "clsx"
import type { Database } from "@/lib/supabase/types"

type Student = Database["public"]["Tables"]["student_profiles"]["Row"]

interface Props {
  students: Student[]
  selectedId: string | null
  onSelect: (student: Student) => void
}

export default function StudentList({ students, selectedId, onSelect }: Props) {
  return (
    <aside className="w-full md:w-[22%] border-r h-[calc(100vh-56px)] overflow-y-auto">
      {students.map((stu) => (
        <button
          key={stu.id}
          onClick={() => onSelect(stu)}
          className={clsx(
            "w-full text-left p-4 border-b hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-500",
            selectedId === stu.id && "bg-blue-50 border-l-4 border-blue-600"
          )}
        >
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage
                src={stu.avatar_url ?? "/placeholder.svg"}
                alt={stu.full_name ?? ""}
              />
              <AvatarFallback>
                {stu.full_name?.slice(0, 2) ?? "👤"}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{stu.full_name}</p>
              <p className="text-sm text-gray-500 truncate">
                {stu.university}
              </p>
              <div className="flex items-center mt-1 gap-2">
                <Badge variant="outline" className="text-xs">
                  {stu.graduation_year}卒
                </Badge>
                {stu.status && (
                  <Badge variant="secondary" className="text-xs">
                    {stu.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </aside>
  )
}