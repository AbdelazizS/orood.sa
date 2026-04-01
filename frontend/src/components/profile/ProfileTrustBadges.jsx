import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ProfileTrustBadges({ badges }) {
  if (!badges?.length) return null

  return (
    <div className="flex flex-wrap justify-end gap-2 px-4 py-2">
      {badges.map((label, i) => (
        <Badge
          key={i}
          variant="outline"
          className="text-xs px-2 py-0.5"
        >
          {label}
        </Badge>
      ))}
    </div>
  )
}
