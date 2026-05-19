/** Remove legacy placeholder @arooth.com addresses from CMS HTML (DB may lag behind seeders). */
export function stripPlaceholderEmails(html) {
  if (!html || typeof html !== "string") return html
  let out = html
  out = out.replace(
    /<p[^>]*>\s*(?:legal|privacy|refunds|partnerships|info|support)@arooth\.com(?:\s*·\s*info@arooth\.com)?\s*<\/p>/gi,
    "",
  )
  out = out.replace(
    /\b(?:legal|privacy|refunds|partnerships|info|support)@arooth\.com(?:\s*·\s*info@arooth\.com)?/gi,
    "",
  )
  return out.trim()
}
