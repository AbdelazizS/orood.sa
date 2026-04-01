import * as LucideIcons from "lucide-react"

/**
 * Renders a Lucide icon by name (e.g. "Package", "Search").
 * Falls back to Package if name is invalid.
 */
export function DynamicIcon({ name, className, ...props }) {
  const Icon = name && LucideIcons[name] ? LucideIcons[name] : LucideIcons.Package
  return <Icon className={className} {...props} />
}
