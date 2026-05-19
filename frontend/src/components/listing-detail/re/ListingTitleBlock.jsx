import { useAppDirection } from "@/providers/DirectionProvider"

export function ListingTitleBlock({ product }) {
  const { direction } = useAppDirection()
  const title = product?.title?.trim()
  if (!title) return null

  return (
    <div dir={direction} className="bg-card px-4 py-3">
      <h1 className="text-start text-xl font-bold leading-snug text-foreground">{title}</h1>
    </div>
  )
}

