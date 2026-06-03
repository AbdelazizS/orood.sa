import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { fetchContactPage, submitContactInquiry } from "@/services/contactService"
import { ResponsiveSupportLayout } from "@/components/contact/ResponsiveSupportLayout"
import { ContactHeroSection } from "@/components/contact/ContactHeroSection"
import { ContactMethodsGrid } from "@/components/contact/ContactMethodsGrid"
import { DynamicSupportForm } from "@/components/contact/DynamicSupportForm"
import { FAQAccordion } from "@/components/contact/FAQAccordion"
import { TrustSafetySection } from "@/components/contact/TrustSafetySection"
import { ContactIntroSection } from "@/components/contact/ContactIntroSection"
import { SeoHead } from "@/components/seo/SeoHead"
import { useResolvedSeo } from "@/hooks/useResolvedSeo"
import { usePageSeo } from "@/hooks/usePageSeo"

export function ContactPage() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isReportFlow = searchParams.get("topic") === "report"
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const pageQuery = useQuery({
    queryKey: ["contact-page", i18n.language],
    queryFn: () => fetchContactPage(i18n.language),
  })

  const submitMutation = useMutation({
    mutationFn: submitContactInquiry,
    onSuccess: (res) => {
      const msg = res?.message || pageQuery.data?.success_message || t("contactPage.success")
      setSuccessMessage(msg)
      setSubmitted(true)
      toast.success(msg)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || t("common.error"))
    },
  })

  const page = pageQuery.data
  const pageForHero = page
    ? {
        ...page,
        hero_title: isReportFlow
          ? t("contactPage.reportHeroTitle", "الإبلاغ عن مشكلة")
          : page.hero_title,
        hero_subtitle: isReportFlow
          ? t(
              "contactPage.reportHeroSubtitle",
              "أبلغ عن إعلان مخالف أو مستخدم مخالف أو عملية احتيال. سنراجع البلاغ خلال 24 ساعة.",
            )
          : page.hero_subtitle,
      }
    : null

  const fallbackSeo = usePageSeo("contact")
  const resolvedSeo = useResolvedSeo("/contact")
  const seo = resolvedSeo.data ?? fallbackSeo

  return (
    <ResponsiveSupportLayout
      title={pageForHero?.hero_title}
      isLoading={pageQuery.isLoading}
      isError={pageQuery.isError}
      onRetry={() => pageQuery.refetch()}
    >
      <SeoHead
        path="/contact"
        title={seo?.seo_title ?? seo?.title}
        description={seo?.description}
        image={seo?.og?.image}
        hreflang={seo?.hreflang}
        useTitleAsFull={Boolean(seo?.seo_title)}
      />
      <ContactHeroSection page={pageForHero} />
      <ContactIntroSection isReportFlow={isReportFlow} channels={page?.channels} />
      <ContactMethodsGrid channels={page?.channels} />

      <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-10">
        {page?.form_enabled !== false ? (
          <DynamicSupportForm
            page={page}
            isPending={submitMutation.isPending}
            isSuccess={submitted}
            successMessage={successMessage}
            onReset={() => setSubmitted(false)}
            onSubmit={(formData) => submitMutation.mutate(formData)}
            defaultInquiryType={isReportFlow ? "report" : null}
            formTitle={
              isReportFlow ? t("contactPage.reportFormTitle", "نموذج الإبلاغ") : null
            }
          />
        ) : null}
        <div className="space-y-6">
          <FAQAccordion faq={page?.faq} />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(
              "contactPage.faqSidebarHint",
              "For logged-in members, more guides are available from the dashboard help center.",
            )}
          </p>
        </div>
      </div>

      <TrustSafetySection blocks={page?.trust_blocks} />
    </ResponsiveSupportLayout>
  )
}
