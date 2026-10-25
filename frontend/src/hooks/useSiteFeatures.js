import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"

/** Public homepage switches (same cache as useHomepageFeed's features query). */
export function useSiteFeatures() {
  const { i18n } = useTranslation()
  const query = useQuery({
    queryKey: ["homepage", "features", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/homepage/features")
      return data?.data ?? { show_wholesale: true, show_company_directory: true }
    },
    staleTime: 1000 * 60 * 5,
  })
  return {
    ...query,
    // «سوق الجملة» button: hidden until the admin turns it on (Settings → عام).
    showWholesaleButton: query.data?.show_wholesale_button === true,
  }
}
