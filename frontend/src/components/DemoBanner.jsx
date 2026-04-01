import { USE_DEMO } from "@/lib/apiClient"

export function DemoBanner() {
  if (!USE_DEMO) return null

  return (
    <div className="flex items-center justify-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
      <span className="font-medium">وضع العرض التوضيحي</span>
      <span className="opacity-80">— بيانات تجريبية</span>
    </div>
  )
}
