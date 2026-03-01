import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import apiClient from "@/lib/apiClient"
import { MessageSquare, Search } from "lucide-react"
import { Link } from "react-router-dom"

export function AdminMessagesPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "conversations", search, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("page", String(page))
      const { data: res } = await apiClient.get(`/admin/conversations?${params}`)
      return res ?? {}
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.messagesTitle", "All Messages")}</h1>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
            onChange={(e) => setSearch(e.target.value)}
            className="ps-8 w-48"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              {t("admin.conversations", "Conversations")}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto p-0">
            {conversations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {t("analytics.noData")}
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-muted ${selectedId === c.id ? "bg-muted" : ""}`}
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback>{(c.buyer?.name ?? c.seller?.name ?? "?")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.buyer?.name ?? "—"} ↔ {c.seller?.name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.product?.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{c.messages_count} {t("admin.messagesCount", "messages")}</p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          {selectedId ? (
            detailLoading ? (
              <div className="flex items-center justify-center p-12">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : conv ? (
              <>
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link to={`/products/${conv.product?.id}`} className="hover:underline">
                      {conv.product?.title ?? "—"}
                    </Link>
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {conv.buyer?.name} ({conv.buyer?.email}) ↔ {conv.seller?.name} ({conv.seller?.email})
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.user_id === conv.buyer?.id ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            m.user_id === conv.buyer?.id ? "bg-muted" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="text-xs font-medium text-muted-foreground">{m.user?.name}</p>
                          <p>{m.body}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(m.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </>
            ) : null
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
              <MessageSquare className="size-12 opacity-50" />
              <p>{t("admin.selectConversation", "Select a conversation")}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
