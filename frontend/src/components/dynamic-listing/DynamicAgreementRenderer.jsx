import { useAppDirection } from "@/providers/DirectionProvider"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export function DynamicAgreementRenderer({ agreements = [], acceptedIds = [], onChange, error }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  if (!agreements.length) return null

  const toggle = (id, checked) => {
    const set = new Set(acceptedIds)
    if (checked) set.add(id)
    else set.delete(id)
    onChange(Array.from(set))
  }

  return (
    <div
      dir={direction}
      className={cn(
        "mb-4 rounded-lg border border-border bg-muted/30 px-4 py-4",
        error && "border-destructive/50",
      )}
    >
      <p className="mb-3 text-sm font-semibold text-foreground">
        {t("addListing.agreementsTitle", "إقرارات وشروط")}
      </p>
      <ol className="list-decimal space-y-3 ps-4 text-sm text-muted-foreground">
        {agreements.map((agreement) => (
          <li key={agreement.id}>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={acceptedIds.includes(agreement.id)}
                onCheckedChange={(v) => toggle(agreement.id, !!v)}
              />
              <span>{agreement.content}</span>
            </label>
          </li>
        ))}
      </ol>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
