import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { SeoHead } from "@/components/seo/SeoHead"
import { Skeleton } from "@/components/ui/skeleton"
import { usePageSeo } from "@/hooks/usePageSeo"
import { useResolvedSeo } from "@/hooks/useResolvedSeo"
import { CompanyPageLayout } from "@/components/legal/CompanyPageLayout"
import { stripPlaceholderEmails } from "@/lib/stripPlaceholderEmails"
import { PAGE_CONTAINER_CLASS } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

const SLUG_ALIASES = {
  "privacy-policy": "privacy-policy",
  terms: "terms",
  "refund-policy": "refund-policy",
  "payment-policy": "payment-policy",
  "listing-policy": "listing-policy",
  safety: "safety",
  fees: "fees",
  about: "about",
  help: "help",
}

export function LegalPage({ slug: slugProp }) {
  const { slug: slugParam } = useParams()
  const slug = slugProp ?? slugParam ?? "terms"
  const cmsSlug = SLUG_ALIASES[slug] ?? slug
  const { i18n, t } = useTranslation()
  const locale = i18n.language?.startsWith("en") ? "en" : "ar"
  const routeSeo = usePageSeo(`legal.${cmsSlug}`)
  const resolvedSeo = useResolvedSeo(cmsSlug === "help" ? "/help" : `/${cmsSlug}`, {}, { enabled: cmsSlug === "help" })

  const { data, isLoading, error } = useQuery({
    queryKey: ["cms", "page", cmsSlug, locale],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/cms/pages/${cmsSlug}`, { params: { locale } })
      return res?.data ?? res
    },
  })

  const page = data
  const apiSeo = cmsSlug === "help" ? resolvedSeo.data : null
  const title = apiSeo?.seo_title ?? page?.meta_title ?? page?.title ?? routeSeo.title
  const description = apiSeo?.description ?? page?.meta_description ?? routeSeo.description
  const showSupportCta = cmsSlug === "help" || cmsSlug === "about"

  if (isLoading) {
    return (
      <div className={cn(PAGE_CONTAINER_CLASS, "w-full space-y-4 py-8")}>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className={cn(PAGE_CONTAINER_CLASS, "w-full py-12 text-start text-muted-foreground")}>
        <p>{t("legal.pageNotFound", "الصفحة غير متوفرة حالياً.")}</p>
        <p className="mt-2 text-sm">
          {t("legal.runSeederHint", "تأكد من تشغيل: php artisan db:seed --class=CmsPagesSeeder")}
        </p>
      </div>
    )
  }

  return (
    <>
      <SeoHead
        path={cmsSlug === "help" ? "/help" : `/${cmsSlug === "privacy-policy" ? "privacy-policy" : cmsSlug}`}
        title={title}
        description={description}
        canonical={page.canonical}
        ogImage={page.og_image}
        hreflang={apiSeo?.hreflang}
        robots={apiSeo?.robots}
        useTitleAsFull={Boolean(apiSeo?.seo_title)}
      />
      <CompanyPageLayout
        title={page.title}
        updatedAt={page.updated_at}
        locale={locale}
        showSupportCta={showSupportCta}
      >
        <div
          dangerouslySetInnerHTML={{
            __html: stripPlaceholderEmails(page.body_html ?? ""),
          }}
        />
      </CompanyPageLayout>
    </>
  )
}
