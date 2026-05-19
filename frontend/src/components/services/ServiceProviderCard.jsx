import { Link } from "react-router-dom"
import { Star, MapPin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { resolveImageUrl } from "@/lib/imageUrl"
import { cn } from "@/lib/utils"

export function ServiceProviderCard({ provider, t, dir = "rtl", className }) {
  const initial = (provider?.title?.[0] ?? "S").toUpperCase()
  const avatar = provider?.user?.avatar ? resolveImageUrl(provider.user.avatar) : undefined

  return (
    <article
      dir={dir}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <Avatar className="size-12 shrink-0 border border-border/60">
          <AvatarImage src={avatar} alt="" />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-start">
          <h3 className="truncate font-semibold text-foreground">{provider.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{provider.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {Number(provider.rating_avg || 0).toFixed(1)} ({provider.rating_count ?? 0})
            </span>
            {(provider.cities ?? []).slice(0, 2).map((city) => (
              <span key={city} className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {city}
              </span>
            ))}
          </div>
          {provider.category?.name ? (
            <Badge variant="secondary" className="mt-2 rounded-full">
              {provider.category.name}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-auto border-t border-border/60 p-4">
        <Button className="w-full rounded-xl" asChild>
          <Link to={`/services/provider/${provider.id}`}>{t("services.card.viewProfile")}</Link>
        </Button>
      </div>
    </article>
  )
}
