import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { MessageSquare, Loader2, Send, Trash2 } from "lucide-react"

export function CommentSection({ product }) {
  const { t } = useTranslation()
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const [body, setBody] = useState("")
  const [replyTo, setReplyTo] = useState(null)

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", product?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${product.id}/comments`)
      return data?.data ?? []
    },
    enabled: Boolean(product?.id),
  })

  const storeMutation = useMutation({
    mutationFn: (payload) =>
      apiClient.post(`/products/${product.id}/comments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", product.id] })
      setBody("")
      setReplyTo(null)
    },
  })

  const destroyMutation = useMutation({
    mutationFn: (commentId) => apiClient.delete(`/comments/${commentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", product.id] }),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!body.trim() || !token) return
    storeMutation.mutate({ body: body.trim(), parent_id: replyTo })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return t("comments.justNow", "Just now")
    if (diff < 3600000) return t("comments.minutesAgo", "{{count}} min ago", { count: Math.floor(diff / 60000) })
    if (diff < 86400000) return t("comments.hoursAgo", "{{count}}h ago", { count: Math.floor(diff / 3600000) })
    return d.toLocaleDateString()
  }

  const CommentItem = ({ comment, isReply = false }) => (
    <div className={isReply ? "ms-8 mt-2 border-s-2 ps-3" : ""}>
      <div className="flex gap-3">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="text-xs">
            {comment.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{comment.user?.name ?? "—"}</span>
            <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
            {user?.id === comment.user_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-destructive"
                onClick={() => destroyMutation.mutate(comment.id)}
                disabled={destroyMutation.isPending}
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
          {token && !isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-7 text-xs"
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            >
              {t("comments.reply", "Reply")}
            </Button>
          )}
          {comment.replies?.map((r) => (
            <CommentItem key={r.id} comment={r} isReply />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4" />
          {t("comments.title", "Comments")} ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {token && (
          <form onSubmit={handleSubmit} className="space-y-2">
            {replyTo && (
              <p className="text-xs text-muted-foreground">
                {t("comments.replyingTo", "Replying to comment")} —{" "}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setReplyTo(null)}
                >
                  {t("common.cancel")}
                </Button>
              </p>
            )}
            <Textarea
              placeholder={t("comments.placeholder", "Write a comment...")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={storeMutation.isPending}
              rows={3}
              className="resize-none"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!body.trim() || storeMutation.isPending}
            >
              {storeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t("comments.post", "Post")}
            </Button>
          </form>
        )}
        {!token && (
          <p className="text-sm text-muted-foreground">
            {t("comments.loginToComment", "Log in to leave a comment")}
          </p>
        )}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("comments.empty", "No comments yet. Be the first!")}
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <CommentItem key={c.id} comment={c} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
