import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ChatThreadPanel, MessageBubble } from "@/components/messaging/messagesUi"
import { ConversationListItem } from "@/components/messaging/ConversationListItem"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { Send, MessageSquare, ArrowLeft, Loader2, Bell } from "lucide-react"
import { NotificationsPage } from "@/pages/dashboard/NotificationsPage"
import { NotificationDetailInner } from "@/pages/dashboard/NotificationDetailPage"

export function MessagesPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(null)
  const [message, setMessage] = useState("")

  const hub = searchParams.get("hub") === "notifications" ? "notifications" : "messages"
  const nid = (searchParams.get("nid") ?? "").trim()

  const setHub = useCallback(
    (nextHub) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (nextHub === "messages") {
            next.delete("hub")
            next.delete("nid")
          } else {
            next.set("hub", "notifications")
            next.delete("nid")
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const withRaw = searchParams.get("with")?.trim() ?? ""
  const productRaw = searchParams.get("product")?.trim() ?? ""
  const pendingRecipientId = useMemo(() => {
    const n = Number(withRaw)
    if (!Number.isFinite(n) || n <= 0 || n === user?.id) return null
    return n
  }, [withRaw, user?.id])
  const pendingProductId = useMemo(() => {
    const n = Number(productRaw)
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }, [productRaw])

  useEffect(() => {
    if (!pendingRecipientId && !pendingProductId) return
    if (hub !== "notifications") return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("hub")
        next.delete("nid")
        return next
      },
      { replace: true },
    )
  }, [pendingRecipientId, pendingProductId, hub, setSearchParams])

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await apiClient.get("/conversations")
      return data?.data ?? []
    },
  })

  const selected = useMemo(
    () => conversations.find((c) => Number(c.id) === Number(selectedId)) ?? null,
    [conversations, selectedId],
  )

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/conversations/${selectedId}`)
      return data?.data ?? []
    },
    enabled: Boolean(selectedId),
  })

  const threadAnchorKey = useMemo(() => {
    if (!selectedId) return ""
    const last = messages.at(-1)
    return `${selectedId}:${last?.id ?? "none"}:${messages.length}`
  }, [selectedId, messages])

  useEffect(() => {
    if (!selectedId || messagesLoading) return
    queryClient.invalidateQueries({ queryKey: ["conversations"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
  }, [selectedId, messagesLoading, queryClient])

  useEffect(() => {
    if (isLoading || !user?.id) return
    if (!pendingRecipientId) return

    const match = conversations.find(
      (c) =>
        (c.conversation_type === "direct" || !c.product_id) &&
        ((c.buyer_id === user.id && c.seller_id === pendingRecipientId) ||
          (c.seller_id === user.id && c.buyer_id === pendingRecipientId)),
    )
    if (match) {
      setSelectedId(match.id)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete("with")
        next.set("c", String(match.id))
        return next
      })
    }
  }, [isLoading, conversations, pendingRecipientId, user?.id, setSearchParams])

  useEffect(() => {
    if (isLoading || !user?.id) return
    if (!pendingProductId) return
    const match = conversations.find(
      (c) => Number(c.product_id) === pendingProductId && Number(c.buyer_id) === Number(user.id),
    )
    if (match) {
      setSelectedId(match.id)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete("product")
        next.set("c", String(match.id))
        return next
      })
    }
  }, [isLoading, conversations, pendingProductId, user?.id, setSearchParams])

  useEffect(() => {
    const raw = searchParams.get("c")
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) {
      if (n !== selectedId) setSelectedId(n)
      return
    }
    if (!pendingRecipientId && !pendingProductId && selectedId !== null) {
      setSelectedId(null)
    }
  }, [searchParams, selectedId, pendingRecipientId, pendingProductId])

  const sendMutation = useMutation({
    mutationFn: ({ conversationId, recipientId, productId, body }) => {
      if (conversationId) {
        return apiClient.post(`/conversations/${conversationId}/messages`, { body })
      }
      if (recipientId) {
        return apiClient.post("/messages", { recipient_id: recipientId, body })
      }
      return apiClient.post("/messages", { product_id: productId, body })
    },
    onSuccess: async (res, vars) => {
      const cid = res?.data?.conversation_id
      if (!vars.conversationId && cid) {
        setSelectedId(cid)
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete("with")
          next.delete("product")
          next.set("c", String(cid))
          return next
        })
      }
      setMessage("")
      await queryClient.invalidateQueries({ queryKey: ["conversations"] })
      if (vars.conversationId) {
        await queryClient.invalidateQueries({ queryKey: ["conversation", vars.conversationId] })
      } else if (cid) {
        await queryClient.invalidateQueries({ queryKey: ["conversation", cid] })
      }
    },
  })

  const sendMessage = (e) => {
    e.preventDefault()
    const body = message.trim()
    if (!body) return
    if (selectedId) {
      sendMutation.mutate({ conversationId: selectedId, body })
      return
    }
    if (pendingRecipientId) {
      sendMutation.mutate({ recipientId: pendingRecipientId, body })
      return
    }
    if (pendingProductId) {
      sendMutation.mutate({ productId: pendingProductId, body })
    }
  }

  const inboxTabs = (
    <div
      role="tablist"
      className="flex h-auto w-full max-w-md flex-wrap gap-1 rounded-xl bg-muted/40 p-1"
    >
      <Button
        type="button"
        size="sm"
        variant={hub === "messages" ? "default" : "ghost"}
        className="flex-1 gap-2 rounded-lg"
        onClick={() => setHub("messages")}
      >
        <MessageSquare className="size-4 shrink-0" />
        {t("dashboard.nav.inboxTabConversations")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={hub === "notifications" ? "default" : "ghost"}
        className="flex-1 gap-2 rounded-lg"
        onClick={() => setHub("notifications")}
      >
        <Bell className="size-4 shrink-0" />
        {t("dashboard.nav.inboxTabNotifications")}
      </Button>
    </div>
  )

  if (hub === "notifications" && nid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.nav.inbox")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.inboxSubtitle")}</p>
        </div>
        {inboxTabs}
        <NotificationDetailInner notificationId={nid} backHref="/dashboard/messages?hub=notifications" />
      </div>
    )
  }

  if (hub === "notifications") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.nav.inbox")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.inboxSubtitle")}</p>
        </div>
        {inboxTabs}
        <NotificationsPage embedded />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.nav.inbox")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.inboxSubtitle")}</p>
        </div>
        {inboxTabs}
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.nav.inbox")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.inboxSubtitle")}</p>
      </div>
      {inboxTabs}

      <div className="mt-4">
          <div className="grid min-h-[70vh] gap-4 md:grid-cols-[320px,1fr]">
            <Card className={selectedId ? "hidden md:block" : ""}>
              <CardHeader>
                <CardTitle className="text-base">{t("messages.conversations", "Conversations")}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[70vh] overflow-y-auto p-0">
                {conversations.map((conv) => {
                  const other = conv.buyer_id === user?.id ? conv.seller : conv.buyer
                  return (
                    <ConversationListItem
                      key={conv.id}
                      title={other?.name ?? t("common.unknown", "Unknown")}
                      subtitle={conv.product?.title}
                      preview={conv.last_message?.body}
                      timeLabel={conv.last_message?.created_at ? new Date(conv.last_message.created_at).toLocaleTimeString() : ""}
                      unreadCount={conv.unread_count ?? 0}
                      isActive={selectedId === conv.id}
                      onClick={() => {
                        setSelectedId(conv.id)
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev)
                          next.delete("with")
                          next.delete("hub")
                          next.delete("nid")
                          next.set("c", String(conv.id))
                          return next
                        })
                      }}
                    />
                  )
                })}
              </CardContent>
            </Card>
            <Card className={selectedId || pendingRecipientId || pendingProductId ? "" : "hidden md:block"}>
              {selected || pendingRecipientId || pendingProductId ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        type="button"
                        onClick={() => {
                          setSelectedId(null)
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev)
                            next.delete("c")
                            return next
                          })
                        }}
                      >
                        <ArrowLeft className="size-4" />
                      </Button>
                      <CardTitle className="text-base">
                        {selected?.product?.title ??
                          (selected?.conversation_type === "direct" || !selected?.product_id
                            ? t("messages.directConversation")
                            : t("messages.conversationTitle", "Conversation"))}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex min-h-[62vh] flex-col gap-3">
                    {messagesLoading ? (
                      <div className="flex flex-1 items-center justify-center">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ChatThreadPanel anchorKey={threadAnchorKey} className="rounded-md border bg-background/30">
                        {messages.length === 0 ? (
                          <p className="py-8 text-center text-sm text-muted-foreground">
                            {(pendingRecipientId || pendingProductId) && !selectedId
                              ? t("messages.startDirectHint")
                              : t("messages.threadEmpty")}
                          </p>
                        ) : (
                          messages.map((m) => (
                            <MessageBubble
                              key={m.id}
                              body={m.body}
                              isOwn={m.user_id === user?.id}
                              timestamp={m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                            />
                          ))
                        )}
                      </ChatThreadPanel>
                    )}
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage(e)
                          }
                        }}
                        rows={3}
                        className="resize-none text-base min-h-[48px]"
                        placeholder={t("messages.typeMessage", "Type a message...")}
                      />
                      <Button type="submit" disabled={sendMutation.isPending || !message.trim()}>
                        {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        <span className="sr-only">{t("messages.send", "Send")}</span>
                      </Button>
                    </form>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex flex-col items-center justify-center py-24">
                  <MessageSquare className="size-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">{t("messages.selectConversation", "Select a conversation")}</p>
                </CardContent>
              )}
            </Card>
          </div>
          {conversations.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {t("messages.empty", "No conversations yet. Contact a seller from a product page to start chatting.")}
            </p>
          )}
        </div>
      </div>
  )
}
