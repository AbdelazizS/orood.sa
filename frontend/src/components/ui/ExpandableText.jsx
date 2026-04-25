import { useMemo, useState } from "react"
import { useTranslation } from "@/hooks/useTranslation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const DEFAULT_MAX = 180

export function ExpandableText({ text, maxLength = DEFAULT_MAX, className }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const plain = String(text ?? "").trim()
  const needsTruncate = plain.length > maxLength

  const display = useMemo(() => {
    if (!plain) return ""
    if (expanded || !needsTruncate) return plain
    return `${plain.slice(0, maxLength).trimEnd()}…`
  }, [plain, expanded, needsTruncate, maxLength])

  if (!plain) return null

  return (
    <div className={cn("text-start", className)}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{display}</p>
      {needsTruncate ? (
        <Button
          type="button"
          variant="link"
          className="mt-1 h-auto p-0 text-xs font-medium"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? t("publicProfile.readLess", "عرض أقل")
            : t("publicProfile.readMore", "عرض المزيد")}
        </Button>
      ) : null}
    </div>
  )
}
