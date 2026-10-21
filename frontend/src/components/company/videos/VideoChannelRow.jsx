import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { publicProfilePath } from "@/lib/profileRoutes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CompanyActivityChips } from "@/components/company/CompanyActivityChips"
import { BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"

/** Channel line under a video: avatar, company name, verified badge, activities. */
export function VideoChannelRow({ company, className, light = false }) {
  const { t } = useTranslation()
  if (!company) return null
  const href = publicProfilePath({ username: company.username, id: company.user_id }) ?? "#"

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Link to={href} className="shrink-0">
        <Avatar className="size-10">
          {company.avatar_url ? <AvatarImage src={company.avatar_url} alt="" /> : null}
          <AvatarFallback className="font-bold">{company.name?.charAt(0) ?? "?"}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0">
        <Link to={href} className={cn("flex items-center gap-1 font-semibold hover:underline", light ? "text-white" : "text-foreground")}>
          <span className="truncate">{company.name}</span>
          {company.is_verified ? <BadgeCheck className="size-4 shrink-0 text-sky-500" aria-label={t("videoComments.verifiedCompany", "شركة موثّقة")} /> : null}
        </Link>
        <CompanyActivityChips activities={company.activities} className="mt-1 gap-1 [&>span]:px-2 [&>span]:py-0.5 [&>span]:text-[10px]" />
      </div>
    </div>
  )
}
