import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"

/**
 * Section 6 — Publisher Info Note.
 * Display when listing has publisher contact/note info.
 */
export function PublisherInfoNote({ product }) {
  const { direction } = useAppDirection()
  const note = product?.publisher_note ?? product?.contact_note ?? ""
  if (!note) return null

  return (
    <>
      <div
        dir={direction}
        className="bg-muted/40 px-4 py-4 text-start text-sm leading-relaxed text-muted-foreground sm:px-6"
      >
        {note}
      </div>
      <Separator />
    </>
  )
}
