import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ConversationListItem } from "@/components/messaging/ConversationListItem"
import { MessageBubble } from "@/components/messaging/MessageBubble"
import { ChatThreadPanel } from "@/components/messaging/ChatThreadPanel"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { Bell, MessageSquare, Search, ChevronLeft, ChevronRight, ArrowLeft, Loader2, Send } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

const NOTICE_PURPOSES = [
  { value: "general", labelKey: "admin.noticePurposeGeneral" },
  { value: "account_warning", labelKey: "admin.noticePurposeAccountWarning" },
  { value: "finance_wallet", labelKey: "admin.noticePurposeFinanceWallet" },
  { value: "order", labelKey: "admin.noticePurposeOrder" },
  { value: "verification", labelKey: "admin.noticePurposeVerification" },
  { value: "custom", labelKey: "admin.noticePurposeCustom" },
]

function recipientPayload(trimmed) {
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return { user_id: Number(trimmed) }
  return { user_email: trimmed }
}

/** Matches backend `UserRole::isPlatformManager()` for thread labels. */
const PLATFORM_STAFF_ROLES = new Set(["super_admin", "admin", "manager", "employee", "moderator"])

function isPlatformStaffRole(role) {
  return Boolean(role && PLATFORM_STAFF_ROLES.has(String(role)))
}

/** Staff–member direct chats use DB buyer/seller slots; show support vs member, not مشتري/بائع. */
function adminThreadParticipantShortLabel(conv, messageUserId, t) {
  const hasProduct = Boolean(conv?.product?.id)
  if (hasProduct) {
    return messageUserId === conv.buyer?.id
      ? t("admin.threadParticipantBuyer", "Buyer")
      : t("admin.threadParticipantSeller", "Seller")
  }

  const type = conv?.conversation_type || "listing"
  if (type !== "direct") {
    return messageUserId === conv.buyer?.id
      ? t("admin.threadParticipantBuyer", "Buyer")
      : t("admin.threadParticipantSeller", "Seller")
  }

  const buyerStaff = isPlatformStaffRole(conv.buyer?.role)
  const sellerStaff = isPlatformStaffRole(conv.seller?.role)
  if (buyerStaff && !sellerStaff) {
    return messageUserId === conv.buyer?.id ? t("admin.threadRoleSupport", "Support") : t("admin.threadRoleMember", "Member")
  }
  if (sellerStaff && !buyerStaff) {
    return messageUserId === conv.seller?.id ? t("admin.threadRoleSupport", "Support") : t("admin.threadRoleMember", "Member")
  }

  return messageUserId === conv.buyer?.id
    ? t("admin.threadDirectPartyOne", "Participant A")
    : t("admin.threadDirectPartyTwo", "Participant B")
}

function staffMemberDirectMeta(conv) {
  if ((conv?.conversation_type || "") !== "direct" || conv?.product?.id) return null
  const buyerStaff = isPlatformStaffRole(conv.buyer?.role)
  const sellerStaff = isPlatformStaffRole(conv.seller?.role)
  if (buyerStaff && !sellerStaff) return { staff: conv.buyer, member: conv.seller }
  if (sellerStaff && !buyerStaff) return { staff: conv.seller, member: conv.buyer }
  return null
}

export function AdminMessagesPage() {
  const { t } = useTranslation()
  const { user: authUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialRecipient = (searchParams.get("user_email") || searchParams.get("user_id") || "").trim()
  const [search, setSearch] = useState(initialRecipient)
  const [directRecipient, setDirectRecipient] = useState(initialRecipient)
  const [directPurpose, setDirectPurpose] = useState("general")
  const [directCustomTitle, setDirectCustomTitle] = useState("")
  const [directBody, setDirectBody] = useState("")
  const [selectedId, setSelectedId] = useState(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [threadMessage, setThreadMessage] = useState("")
  const openedDirectConversationKeyRef = useRef("")

  useEffect(() => {
    const e = (searchParams.get("user_email") || "").trim()
    const uid = (searchParams.get("user_id") || "").trim()
    const next = e || uid
    if (next) {
      setDirectRecipient(next)
      if (e) setSearch(e)
    }
  }, [searchParams])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "conversations", search, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("page", String(page))
      params.set("per_page", String(perPage))
      const { data: res } = await apiClient.get(`/admin/conversations?${params}`)
      return res ?? {}
    },
  })
  const { data: teamAnnouncements = [] } = useQuery({
    queryKey: ["announcements", "team"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/announcements", { params: { target: "team" } })
      return res?.data ?? []
    },
  })
  const { data: unifiedSummary } = useQuery({
    queryKey: ["admin", "messages", "summary"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/messages/summary")
      return res?.data ?? null
    },
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "conversation", selectedId],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/admin/conversations/${selectedId}`)
      return res?.data ?? null
    },
    enabled: !!selectedId,
  })

  const conversations = data?.data ?? []
  const meta = data?.meta ?? {}
  const conv = detailData?.conversation
  const messages = detailData?.messages ?? []

  useEffect(() => {
    const fromEmail = (searchParams.get("user_email") || "").trim()
    if (fromEmail) return
    if (!selectedId && conversations.length > 0 && initialRecipient) {
      setSelectedId(conversations[0].id)
    }
  }, [selectedId, conversations, initialRecipient, searchParams])

  const threadAnchorKey = useMemo(() => {
    if (!selectedId) return ""
    const last = messages.at(-1)
    return `${selectedId}:${last?.id ?? "none"}:${messages.length}`
  }, [selectedId, messages])

  const canSendNotice = useMemo(() => {
    const trimmedRecipient = directRecipient.trim()
    const bodyOk = directBody.trim().length > 0
    const recipientOk = Boolean(recipientPayload(trimmedRecipient))
    const customOk = directPurpose !== "custom" || directCustomTitle.trim().length > 0
    return bodyOk && recipientOk && customOk
  }, [directRecipient, directBody, directPurpose, directCustomTitle])

  const canOpenConversation = useMemo(() => Boolean(recipientPayload(directRecipient.trim())), [directRecipient])

  const directMessageMutation = useMutation({
    mutationFn: async () => {
      const trimmed = directRecipient.trim()
      const idOrEmail = recipientPayload(trimmed)
      if (!idOrEmail) throw new Error("recipient")
      const payload = {
        ...idOrEmail,
        body: directBody.trim(),
        purpose: directPurpose,
      }
      if (directPurpose === "custom") {
        payload.title = directCustomTitle.trim()
      }
      const { data } = await apiClient.post("/admin/messages/direct", payload)
      return data
    },
    onSuccess: () => {
      setDirectBody("")
      if (directPurpose === "custom") setDirectCustomTitle("")
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      toast.success(t("admin.instructionSentToast"))
    },
    onError: (err) => {
      if (err?.message === "recipient") {
        toast.error(t("admin.recipientPlaceholder"))
        return
      }
      const msg = err?.response?.data?.message
      toast.error(typeof msg === "string" ? msg : t("common.error"))
    },
  })

  const openConversationMutation = useMutation({
    mutationFn: async (vars = {}) => {
      let fromVars = directRecipient.trim()
      if (typeof vars.user_email === "string" && vars.user_email.trim()) {
        fromVars = vars.user_email.trim()
      } else if (vars.user_id != null && String(vars.user_id).trim() !== "") {
        fromVars = String(vars.user_id).trim()
      }
      const idOrEmail = recipientPayload(fromVars)
      if (!idOrEmail) throw new Error("recipient")
      const { data } = await apiClient.post("/admin/messages/open-direct-conversation", idOrEmail)
      return { ...data, _silentToast: Boolean(vars.silentToast) }
    },
    onSuccess: (res) => {
      const id = res?.data?.conversation_id
      queryClient.invalidateQueries({ queryKey: ["admin", "conversations"] })
      if (id) {
        setSelectedId(id)
        queryClient.invalidateQueries({ queryKey: ["admin", "conversation", id] })
      }
      if (!res?._silentToast) toast.success(t("admin.openConversationSuccess"))
    },
    onError: (err) => {
      if (err?.message === "recipient") {
        toast.error(t("admin.recipientPlaceholder"))
        return
      }
      const msg = err?.response?.data?.message
      toast.error(typeof msg === "string" ? msg : t("common.error"))
    },
  })

  const sendThreadMutation = useMutation({
    mutationFn: async ({ conversationId, body }) => {
      await apiClient.post(`/admin/conversations/${conversationId}/messages`, { body })
    },
    onSuccess: (_res, vars) => {
      setThreadMessage("")
      queryClient.invalidateQueries({ queryKey: ["admin", "conversation", vars.conversationId] })
      queryClient.invalidateQueries({ queryKey: ["admin", "conversations"] })
    },
    onError: (err) => {
      const msg = err?.response?.data?.message
      toast.error(typeof msg === "string" ? msg : t("messages.sendError"))
    },
  })

  useEffect(() => {
    const email = (searchParams.get("user_email") || "").trim()
    if (!email) return
    const source = (searchParams.get("source") || "").trim()
    const dedupeKey = [
      email,
      source,
      searchParams.get("guarantee_request_id") || "",
      searchParams.get("document_verification_id") || "",
      searchParams.get("charge_id") || "",
      searchParams.get("withdrawal_id") || "",
    ].join("|")
    if (openedDirectConversationKeyRef.current === dedupeKey) return
    openedDirectConversationKeyRef.current = dedupeKey
    setDirectRecipient(email)
    setSearch(email)
    openConversationMutation.mutate({ user_email: email, silentToast: true })
  }, [searchParams, openConversationMutation])

  const sendThreadMessage = (e) => {
    e.preventDefault()
    if (!threadMessage.trim() || !selectedId) return
    sendThreadMutation.mutate({ conversationId: selectedId, body: threadMessage.trim() })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.messagesTitle", "All Messages")}</h1>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (isError) {
    const msg = error?.response?.data?.message
    const text = typeof msg === "string" ? msg : error?.message || t("common.error")
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("admin.messagesTitle", "All Messages")}</h1>
        <p className="text-destructive text-sm">{text}</p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.messagesTitle", "All Messages")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.messagesDesc", "View all conversations between members")}</p>
        </div>
        <div className="relative">
          <Search className="absolute start-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("admin.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full ps-8 sm:w-48"
          />
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" />
            {t("admin.sendInAppNotice")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("admin.directNoticeSubtitle")}</p>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="direct-recipient">{t("admin.recipientPlaceholder")}</Label>
            <Input
              id="direct-recipient"
              type="text"
              autoComplete="off"
              value={directRecipient}
              onChange={(e) => setDirectRecipient(e.target.value)}
              placeholder={t("admin.recipientPlaceholder")}
              className="max-w-xl"
            />
            <p className="text-xs text-muted-foreground">{t("admin.sendDirectInstructionHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.noticePurposeLabel")}</Label>
            <Select value={directPurpose} onValueChange={setDirectPurpose}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTICE_PURPOSES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {t(p.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {directPurpose === "custom" ? (
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="direct-custom-title">{t("admin.customNoticeSubjectLabel")}</Label>
              <Input
                id="direct-custom-title"
                value={directCustomTitle}
                onChange={(e) => setDirectCustomTitle(e.target.value)}
                placeholder={t("admin.customNoticeSubjectPlaceholder")}
                className="max-w-xl"
              />
            </div>
          ) : null}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="direct-body">{t("admin.typeInstruction", "Message")}</Label>
            <Textarea
              id="direct-body"
              value={directBody}
              onChange={(e) => setDirectBody(e.target.value)}
              rows={4}
              placeholder={t("admin.typeInstruction", "Type instruction to client...")}
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Button disabled={!canSendNotice || directMessageMutation.isPending} onClick={() => directMessageMutation.mutate()}>
                {directMessageMutation.isPending ? t("common.loading", "Loading...") : t("admin.sendInstruction", "Send notice")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!canOpenConversation || openConversationMutation.isPending}
                onClick={() => openConversationMutation.mutate()}
              >
                {openConversationMutation.isPending ? t("common.loading", "Loading...") : t("admin.openDirectConversation")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.openDirectConversationHint")}</p>
          </div>
        </CardContent>
      </Card>
      {teamAnnouncements.length > 0 ? (
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base">{t("admin.teamAnnouncements")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {teamAnnouncements.map((a) => (
              <div key={a.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{a.title}</p>
                {a.message ? <p className="text-sm text-muted-foreground mt-1">{a.message}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {unifiedSummary ? (
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base">{t("admin.unifiedMessagesMonitoring")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{t("admin.memberConversations")}</p>
              <p className="text-lg font-semibold">{unifiedSummary.conversations?.listing ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{t("admin.directConversations")}</p>
              <p className="text-lg font-semibold">{unifiedSummary.conversations?.direct ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{t("admin.teamConversations")}</p>
              <p className="text-lg font-semibold">{unifiedSummary.conversations?.team ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{t("admin.unreadContactInquiries")}</p>
              <p className="text-lg font-semibold">{unifiedSummary.contact_inquiries?.new ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <h2 className="text-lg font-semibold tracking-tight">{t("admin.conversations", "Conversations")}</h2>

      <div className="grid min-h-[56vh] gap-4 md:grid-cols-[340px,1fr]">
        <Card className={selectedId ? "hidden min-w-0 md:block" : "min-w-0"}>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              {t("admin.conversations", "Conversations")}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-0 md:max-h-[70vh]">
            {conversations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">{t("analytics.noData")}</div>
            ) : (
              conversations.map((c) => (
                <ConversationListItem
                  key={c.id}
                  title={`${c.buyer?.name ?? "—"} ↔ ${c.seller?.name ?? "—"}`}
                  subtitle={
                    c.conversation_type === "direct"
                      ? t("messages.directConversationSubtitle")
                      : (c.product?.title ?? "—")
                  }
                  preview={`${c.messages_count ?? 0} ${t("admin.messagesCount", "messages")}`}
                  timeLabel={c.updated_at ? new Date(c.updated_at).toLocaleDateString() : ""}
                  isActive={selectedId === c.id}
                  onClick={() => setSelectedId(c.id)}
                />
              ))
            )}
          </CardContent>
          <div className="flex items-center justify-between border-t px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("admin.rowsPerPage", "Rows per page")}</span>
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  setPerPage(Number(v))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(meta.current_page ?? 1) <= 1}
              >
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("admin.pageOf", "Page {{current}} of {{total}}", { current: meta.current_page ?? 1, total: meta.last_page ?? 1 })}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(meta.last_page ?? 1, p + 1))}
                disabled={(meta.current_page ?? 1) >= (meta.last_page ?? 1)}
              >
                <ChevronRight className="size-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        </Card>

        <Card className={selectedId ? "min-w-0 overflow-hidden" : "hidden min-w-0 overflow-hidden md:block"}>
          {selectedId ? (
            detailLoading ? (
              <div className="flex items-center justify-center p-12">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : conv ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="md:hidden" type="button" onClick={() => setSelectedId(null)}>
                      <ArrowLeft className="size-4" />
                    </Button>
                    <CardTitle className="text-base">
                      {conv.product?.id ? (
                        <Link to={`/products/${conv.product.id}`} className="hover:underline">
                          {conv.product.title}
                        </Link>
                      ) : (
                        <span>{t("messages.directConversation")}</span>
                      )}
                    </CardTitle>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {(() => {
                      const meta = staffMemberDirectMeta(conv)
                      if (meta) {
                        return (
                          <>
                            <span className="font-medium text-foreground">{t("admin.threadRoleSupport", "Support")}</span>
                            {": "}
                            {meta.staff?.name} ({meta.staff?.email})
                            {" ↔ "}
                            <span className="font-medium text-foreground">{t("admin.threadRoleMember", "Member")}</span>
                            {": "}
                            {meta.member?.name} ({meta.member?.email})
                          </>
                        )
                      }
                      return (
                        <>
                          {conv.buyer?.name} ({conv.buyer?.email}) ↔ {conv.seller?.name} ({conv.seller?.email})
                        </>
                      )
                    })()}
                  </p>
                </CardHeader>
                <CardContent className="flex min-h-[48vh] flex-col gap-3 md:min-h-[62vh]">
                  <ChatThreadPanel anchorKey={threadAnchorKey} className="min-h-0 flex-1 rounded-md border bg-background/20">
                    {messages.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">{t("messages.threadEmpty")}</p>
                    ) : (
                      messages.map((m) => (
                        <MessageBubble
                          key={m.id}
                          body={m.body}
                          isOwn={m.user_id === authUser?.id}
                          senderName={`${m.user?.name ?? "—"} (${adminThreadParticipantShortLabel(conv, m.user_id, t)})`}
                          showSender
                          timestamp={m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                        />
                      ))
                    )}
                  </ChatThreadPanel>
                  <form onSubmit={sendThreadMessage} className="flex gap-2">
                    <Textarea
                      value={threadMessage}
                      onChange={(e) => setThreadMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendThreadMessage(e)
                        }
                      }}
                      rows={2}
                      className="resize-none"
                      placeholder={t("messages.typeMessage", "Type a message...")}
                    />
                    <Button type="submit" disabled={sendThreadMutation.isPending || !threadMessage.trim()}>
                      {sendThreadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      <span className="sr-only">{t("messages.send", "Send")}</span>
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : null
          ) : (
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <MessageSquare className="size-12 opacity-50" />
              <p className="text-center text-sm">{t("admin.selectConversation", "Select a conversation to read the thread")}</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
