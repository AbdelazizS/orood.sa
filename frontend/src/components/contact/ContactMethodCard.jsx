import { Link } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Globe,
  Ticket,
  Briefcase,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"

const TYPE_ICONS = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  telegram: Send,
  url: Globe,
  ticket: Ticket,
  business: Briefcase,
  address: MapPin,
}

export function ContactMethodCard({ channel, className }) {
  const Icon = TYPE_ICONS[channel.type] ?? Globe
  const hasLink = Boolean(channel.href)

  const inner = (
    <Card
      className={cn(
        "h-full transition-colors",
        hasLink && "hover:border-primary/40 hover:bg-muted/20",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-foreground">{channel.label}</p>
          {channel.description ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{channel.description}</p>
          ) : null}
          {channel.value && !hasLink ? (
            <p className="break-all text-sm text-muted-foreground">{channel.value}</p>
          ) : null}
        </div>
        {hasLink ? (
          <Button variant="outline" size="sm" className="mt-auto w-full sm:w-auto" asChild>
            <span>{channel.cta_label || channel.label}</span>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )

  if (!hasLink) return inner

  const isExternal =
    channel.href.startsWith("http") ||
    channel.href.startsWith("mailto:") ||
    channel.href.startsWith("tel:")

  if (isExternal) {
    return (
      <a href={channel.href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {inner}
      </a>
    )
  }

  return (
    <Link to={channel.href} className="block h-full">
      {inner}
    </Link>
  )
}
