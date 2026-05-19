import { SITE_URL } from "@/components/seo/SeoHead"

export function buildWebSiteSchema(siteName = "عروض Arooth") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: `${SITE_URL}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

export function buildOrganizationSchema({ name, logo, sameAs } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: name ?? "Arooth Platform",
    url: `${SITE_URL}/`,
    logo: logo?.startsWith("http") ? logo : `${SITE_URL}${logo ?? "/logo.png"}`,
    ...(sameAs?.length ? { sameAs } : {}),
  }
}

export function buildCollectionPageSchema({ url, name, description }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
  }
}

export function buildBreadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function buildProductSchema(product, id) {
  const image = product?.media?.image_url ?? product?.media?.gallery?.[0]
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product?.title,
    description: product?.description?.slice(0, 500),
    image: image ? [image] : undefined,
    offers: product?.price
      ? {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "SAR",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/products/${id}`,
        }
      : undefined,
  }
}

export function mergeJsonLd(...schemas) {
  const list = schemas.filter(Boolean)
  if (list.length === 0) return null
  if (list.length === 1) return list[0]
  return { "@context": "https://schema.org", "@graph": list }
}
