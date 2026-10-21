import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { addFollowUpNote, getFollowUpNotes } from "@/services/subscriberService"
import { timeAgo } from "@/lib/timeAgo"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Lock, Send } from "lucide-react"
import { cn } from "@/lib/utils"

const KIND_STYLES = {
  subscriber: "bg-primary/15 text-primary",
  staff: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  admin: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
}

/**
 * Private follow-up thread under a bought listing (chat style).
 * Visible only to the subscriber who bought the ad and Arooth staff/admin.
 */
export function FollowUpNotesThread({ subscriberListingId, className }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [body, setBody] = useState("")
  const endRef = useRef(null)
  const readSyncedRef = useRef(null)
  const queryKey = ["subscriber-listing-notes", subscriberListingId]

  const { data: notes = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => getFollowUpNotes(subscriberListingId),
    enabled: Boolean(subscriberListingId),
    refetchInterval: 20_000,
  })

  const sendMutation = useMutation({
    mutationFn: (text) => addFollowUpNote(subscriberListingId, text),
    onSuccess: () => {
      setBody("")
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ["subscriber", "my-listings"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriber-listings"] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ")),
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" })
  }, [notes.length])

  // The notes request marks the thread read for this viewer — refresh badges once per opened thread.
  useEffect(() => {
    if (isLoading || isError || readSyncedRef.current === subscriberListingId) return
    readSyncedRef.current = subscriberListingId
    queryClient.invalidateQueries({ queryKey: ["subscriber", "my-listings"] })
    queryClient.invalidateQueries({ queryKey: ["subscriber", "overview"] })
    queryClient.invalidateQueries({ queryKey: ["admin", "subscriber-listings"] })
  }, [isLoading, isError, subscriberListingId, queryClient])

  const submit = (e) => {
    e.preventDefault()
    const text = body.trim()
    if (!text || sendMutation.isPending) return
    sendMutation.mutate(text)
  }

  const kindLabel = (kind) =>
    kind === "subscriber"
      ? t("subscriber.notes.kindSubscriber", "المشترك")
      : kind === "admin"
        ? t("subscriber.notes.kindAdmin", "الإدارة")
        : t("subscriber.notes.kindStaff", "موظف عروض")

  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Lock className="size-4 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-bold">{t("subscriber.notes.title", "متابعة التسويق")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("subscriber.notes.privacy", "تظهر فقط للمشترك وفريق عروض والإدارة")}
          </p>
        </div>
      </header>

      <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-3/4" />
            <Skeleton className="ms-auto h-14 w-2/3" />
          </>
        ) : isError ? (
          <p className="text-sm text-destructive">{t("subscriber.notes.loadError", "تعذر تحميل المتابعات")}</p>
        ) : notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("subscriber.notes.empty", "لا توجد متابعات بعد. اكتب أول ملاحظة.")}
          </p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className={cn("flex", n.is_mine ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                  n.is_mine ? "rounded-ss-sm bg-primary/10" : "rounded-se-sm bg-muted",
                )}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold text-foreground">{n.author?.name}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", KIND_STYLES[n.author?.kind] ?? KIND_STYLES.staff)}>
                    {kindLabel(n.author?.kind)}
                  </span>
                </div>
                <p className="whitespace-pre-line leading-relaxed text-foreground">{n.body}</p>
                <time className="mt-1 block text-[11px] text-muted-foreground" dateTime={n.created_at}>
                  {timeAgo(n.created_at, t)}
                </time>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(e)
          }}
          maxLength={2000}
          rows={2}
          placeholder={t("subscriber.notes.placeholder", "مثال: اتصل عميل اليوم وطلب معاينة العقار…")}
          className="min-h-[44px] flex-1 resize-none"
        />
        <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!body.trim() || sendMutation.isPending} aria-label={t("subscriber.notes.send", "إرسال")}>
          {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 rtl:-scale-x-100" />}
        </Button>
      </form>
    </section>
  )
}
