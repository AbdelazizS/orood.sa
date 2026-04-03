import { useState } from "react"

export function ExpandableText({ text, maxLength = 200 }) {
  const [expanded, setExpanded] = useState(false)

  if (!text || text.length <= maxLength) {
    return <p className="text-sm leading-relaxed text-foreground">{text}</p>
  }

  return (
    <p className="text-sm leading-relaxed text-foreground">
      {expanded ? text : text.slice(0, maxLength) + "..."}
      <button
        onClick={() => setExpanded(!expanded)}
        className="ms-1 text-xs font-medium text-primary hover:underline"
      >
        {expanded ? "أقل" : "اقرأ المزيد"}
      </button>
    </p>
  )
}
