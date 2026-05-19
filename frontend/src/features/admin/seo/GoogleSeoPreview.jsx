export function GoogleSeoPreview({ title, description, url }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 max-w-xl">
      <p className="text-xs text-muted-foreground mb-1">Google preview</p>
      <p className="text-[#1a0dab] text-lg leading-snug truncate">{title || "Page title"}</p>
      <p className="text-sm text-[#006621] truncate">{url || "https://www.arooth.com/"}</p>
      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
        {description || "Meta description will appear here."}
      </p>
    </div>
  )
}
