import { Helmet } from "react-helmet-async"

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.arooth.com"
const SITE_NAME = "عروض Arooth"
const DEFAULT_DESCRIPTION =
  "أكبر حراج سعودي للمستعمل والجديد والجملة. بيع واشتري عقارات، سيارات، أثاث، إلكترونيات. اكتشف عروض سوق الجملة بخصومات تصل إلى 35% - انشر إعلانك مجاناً"

function absUrl(path) {
  if (!path) return SITE_URL
  if (path.startsWith("http")) return path
  return `${SITE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
}

/**
 * Per-route SEO tags for SPA.
 */
export function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = "/logo.png",
  keywords = null,
  noindex = false,
  robots = null,
  ogType = "website",
  hreflang = null,
  jsonLd = null,
  useTitleAsFull = false,
}) {
  const canonical = absUrl(path)
  const ogImage = absUrl(image)
  const fullTitle = useTitleAsFull
    ? title
    : title
      ? `${title} | ${SITE_NAME}`
      : `عروض | سوق المستعمل والجديد وسعر الجملة في السعودية`
  const robotsContent = robots ?? (noindex ? "noindex, nofollow" : "index, follow")

  const jsonLdPayload = Array.isArray(jsonLd)
    ? jsonLd.length === 1
      ? jsonLd[0]
      : { "@context": "https://schema.org", "@graph": jsonLd }
    : jsonLd

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={robotsContent} />
      {hreflang?.map((item) => (
        <link key={item.lang} rel="alternate" hrefLang={item.lang} href={item.url || canonical} />
      ))}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title || fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="ar_SA" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {jsonLdPayload ? (
        <script type="application/ld+json">{JSON.stringify(jsonLdPayload)}</script>
      ) : null}
    </Helmet>
  )
}

export { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, absUrl }
