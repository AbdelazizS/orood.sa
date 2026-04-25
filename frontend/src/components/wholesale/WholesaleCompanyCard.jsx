import { Link } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, Package, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function WholesaleCompanyCard({ company, t, compact = false, dir = "rtl" }) {
  const initial = (company?.name?.[0] ?? "C").toUpperCase()

  return (
    <Card className="h-full border-border/80 transition hover:border-primary/40 hover:shadow-sm">
      <CardContent className={`p-4 ${compact ? "" : "space-y-3"}`}>
        <Link
          to={`/wholesale/company/${company.id}`}
          className={cn("flex items-center gap-3", dir === "rtl" ? "" : "flex-row-reverse")}
        >
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={company?.logo_url ?? ""} alt={company?.name ?? ""} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className={cn("min-w-0 flex-1", dir === "rtl" ? "text-end" : "text-start")}>
            <div className={cn("flex items-center gap-2", dir === "rtl" ? "justify-end" : "justify-start")}>
              <p className="line-clamp-1 font-semibold">{company?.name}</p>
              {company?.is_verified ? (
                <ShieldCheck className="size-4 text-primary" aria-hidden />
              ) : (
                <Building2 className="size-4 text-muted-foreground" aria-hidden />
              )}
            </div>
            <div className={cn("mt-1 flex items-center gap-2 text-xs text-muted-foreground", dir === "rtl" ? "justify-end" : "justify-start")}>
              <MapPin className="size-3.5" />
              <span>{company?.city ?? "-"}</span>
              <span>•</span>
              <Package className="size-3.5" />
              <span>{t("wholesale.companies.productsCount", { count: company?.products_count ?? 0 })}</span>
            </div>
          </div>
        </Link>
        {!compact ? (
          <div className={cn("flex", dir === "rtl" ? "justify-end" : "justify-start")}>
            <Badge variant="outline">{company?.category ?? t("common.all")}</Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
