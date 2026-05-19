import { Card, CardContent } from "@/components/ui/card"
import { Headphones, ShieldCheck, Users } from "lucide-react"

const ICON_MAP = {
  "shield-check": ShieldCheck,
  users: Users,
  headset: Headphones,
}

export function TrustSafetySection({ blocks }) {
  if (!blocks?.length) return null

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {blocks.map((block, index) => {
          const Icon = ICON_MAP[block.icon] ?? ShieldCheck
          return (
            <Card key={index} className="border-border/80">
              <CardContent className="space-y-3 p-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="font-semibold text-foreground">{block.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{block.body}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
