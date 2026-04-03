import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { MessageSquare } from "lucide-react"

export function MessagesPage() {
  const { user } = useAuthStore()
  const [selectedId, setSelectedId] = useState(null)
  const [message, setMessage] = useState("")

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await apiClient.get("/conversations")
      return data?.data ?? []
    },
  })

  const selected = conversations.find((c) => c.id === selectedId)
  const { data: messages = [], refetch } = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/conversations/${selectedId}`)
      return data?.data ?? []
    },
    enabled: Boolean(selectedId),
  })

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !selectedId) return
    await apiClient.post(`/conversations/${selectedId}/messages`, { body: message })
    setMessage("")
    refetch()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      <div className="grid gap-4 md:grid-cols-[300px,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {conversations.map((conv) => {
              const other = conv.buyer_id === user?.id ? conv.seller : conv.buyer
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-muted ${selectedId === conv.id ? "bg-muted" : ""}`}
                >
                  <Avatar className="size-10">
                    <AvatarFallback>{other?.name?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{other?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{conv.product?.title}</p>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          {selected ? (
            <>
              <CardHeader>
                <CardTitle className="text-base">{selected.product?.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.user_id === user?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          m.user_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                  />
                  <Button type="submit">Send</Button>
                </form>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-24">
              <MessageSquare className="size-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Select a conversation</p>
            </CardContent>
          )}
        </Card>
      </div>
      {conversations.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No conversations yet. Contact a seller from a product page to start chatting.
        </p>
      )}
    </div>
  )
}
