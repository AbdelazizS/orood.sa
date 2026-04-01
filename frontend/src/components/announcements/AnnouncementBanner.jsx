import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

/**
 * Haraj-style announcement ticker strip — thin scrolling marquee.
 * Light yellow/gray background, small text.
 */
export function AnnouncementBanner() {
  const { data } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/announcements")
      return res?.data ?? []
    },
  })

  const announcements = (data ?? []).filter((a) => a.active !== false && a.is_active !== false)

  const tickerContent = announcements.length > 0
    ? announcements.map((a) => (
        <span key={a.id} className="inline-block me-8">
          {a.title}
          {a.message ? ` — ${a.message}` : ""}
        </span>
      ))
    : [
        <span key="1" className="inline-block me-8">شريط - إعلانات المنصة</span>,
        <span key="2" className="inline-block me-8">---- إعلانات المنصة ----</span>,
        <span key="3" className="inline-block me-8">تنويه</span>,
      ]

  return (
    <div className="border-b bg-[#fffde7] py-1.5 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap text-xs text-[#666] inline-flex">
        {tickerContent}
        {tickerContent}
      </div>
    </div>
  )
}
