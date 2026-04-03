import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { resolveImageUrl } from "@/lib/imageUrl"
import { timeAgo } from "@/lib/timeAgo"
import {
  useDeleteComment,
  useEditComment,
  useLikeComment,
  useListingComments,
  usePostComment,
  useToggleCommentVisibility,
} from "@/hooks/useComments"
import {
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Pencil,
  RefreshCw,
  Trash2,
  MoreVertical,
} from "lucide-react"
import { ShareModal } from "./ShareModal"

/**
 * Section 8 — Comments.
 * Comments ABOVE input. Bid comments green. Like/dislike VERTICAL.
 * Publisher tools at bottom.
 */
export function CommentsSection({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState("")
  const [shareOpen, setShareOpen] = useState(false)

  const isOwner = token && (user?.id === product?.seller?.id || user?.id === product?.user_id)
  const { data, isLoading: commentsLoading } = useListingComments(product?.id)
  const comments = data?.comments ?? []

  const postComment = usePostComment(product?.id)
  const deleteComment = useDeleteComment()
  const editComment = useEditComment()
  const toggleVisibility = useToggleCommentVisibility()
  const likeComment = useLikeComment()

  const bumpMutation = useMutation({
    mutationFn: () => apiClient.post(`/products/${product.id}/bump`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", product.id] }),
  })

  const regularItems = useMemo(
    () => comments.filter((c) => c.type === "REGULAR").sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [comments]
  )
  const bidItems = useMemo(
    () =>
      comments
        .filter((c) => c.type === "BID")
        .sort((a, b) => (Number(a.bid_amount ?? 0) - Number(b.bid_amount ?? 0)) || (new Date(a.created_at) - new Date(b.created_at))),
    [comments]
  )
  const allItems = [...regularItems, ...bidItems]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!commentText.trim() || !token) return
    postComment.mutate({ body: commentText.trim() }, { onSuccess: () => setCommentText("") })
  }

  return (
    <>
      {commentsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : allItems.length > 0 ? (
        <div className="divide-y divide-border">
          {allItems.map((item) =>
            item.type === "BID" ? (
              <div
                key={item.id}
                className="mx-4 my-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 sm:mx-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">
                    {item.bid_amount} {t("common.currency", "ريال")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(item.created_at, t)}
                    </span>
                    <span className="text-sm font-semibold">
                      {item.user?.username ?? item.user?.name ?? "زائر"}
                    </span>
                    <Avatar className="size-6">
                      {item.user?.avatar_url ? (
                        <img
                          src={resolveImageUrl(item.user.avatar_url)}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {(item.user?.username ?? item.user?.name ?? "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={item.id}
                dir={direction}
                className="flex items-start gap-3 px-4 py-3 sm:px-6"
              >
                <Avatar className="size-8 shrink-0">
                  {item.user?.avatar_url ? (
                    <img
                      src={resolveImageUrl(item.user.avatar_url)}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {(item.user?.username ?? item.user?.name ?? "?").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-start">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className="text-sm font-semibold">{item.user?.username ?? item.user?.name ?? "زائر"}</span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(item.created_at, t)}
                    </span>
                    {item.is_hidden_for_viewer && (
                      <span className="text-[11px] font-semibold text-muted-foreground">مخفي</span>
                    )}
                  </div>
                  {editingId === item.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        dir={direction}
                        className="resize-none text-sm"
                      />
                      <div className="flex gap-2 rtl:flex-row-reverse">
                        <Button
                          size="sm"
                          onClick={() => {
                            editComment.mutate(
                              { id: item.id, body: editingText.trim(), listingId: product.id },
                              { onSuccess: () => setEditingId(null) }
                            )
                          }}
                          disabled={!editingText.trim() || editComment.isPending}
                        >
                          حفظ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{item.body}</p>
                  )}
                  {Array.isArray(item.replies) && item.replies.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {item.replies.map((r) => (
                        <div key={r.id} className="ms-10 rounded-md border border-primary/15 bg-primary/5 px-3 py-2">
                          <p className="text-xs font-semibold text-primary">{t("comments.team", "فريق المنصة")}</p>
                          <p className="mt-0.5 text-sm text-foreground">{r.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-row items-center gap-4" dir="ltr">
                  <button
                    type="button"
                    onClick={() => {
                      if (!token) return
                      likeComment.mutate({ id: item.id, listingId: product.id, is_like: true })
                    }}
                    className={`flex flex-col items-center gap-0.5 transition-colors hover:opacity-80 ${
                      item.hasLiked === true ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label={t("comments.like", "Like")}
                  >
                    <ThumbsUp className="size-4" />
                    <span className="text-[10px]">{item.likes_count ?? item.likes ?? 0}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!token) return
                      likeComment.mutate({ id: item.id, listingId: product.id, is_like: false })
                    }}
                    className="flex flex-col items-center gap-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={t("comments.dislike", "Dislike")}
                  >
                    <ThumbsDown className="size-4" />
                    <span className="text-[10px]">{item.dislikes_count ?? item.dislikes ?? 0}</span>
                  </button>
                </div>
                {token && (
                  <div className="ms-2 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          aria-label="menu"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.user?.id && item.user.id === user?.id && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingId(item.id)
                                setEditingText(item.body ?? "")
                              }}
                            >
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteComment.mutate({ id: item.id, listingId: product.id })}
                            >
                              حذف
                            </DropdownMenuItem>
                          </>
                        )}
                        {isOwner && (
                          <>
                            <DropdownMenuItem
                              onClick={() => toggleVisibility.mutate({ id: item.id, listingId: product.id })}
                            >
                              {item.is_visible === false ? "إظهار" : "إخفاء"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteComment.mutate({ id: item.id, listingId: product.id })}
                            >
                              حذف
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      ) : null}

      <div dir={direction} className="px-4 pt-4 sm:px-6">
        <h3 className="text-base font-semibold text-start">
          {t("comments.title", "التعليقات")}
        </h3>
      </div>

      {token && (
        <div className="flex flex-col gap-2 px-4 py-4 sm:px-6">
          <Textarea
            placeholder={t("listingDetail.addComment", "أضف تعليقاً...")}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            dir={direction}
            className="resize-none text-sm"
          />
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!commentText.trim() || postComment.isPending}
          >
            {postComment.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {t("comments.post", "إرسال")}
          </Button>
        </div>
      )}

      {!token && (
        <p className="px-4 py-4 text-sm text-muted-foreground sm:px-6">
          {t("comments.loginToComment", "سجّل الدخول لترك تعليق")}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border px-4 py-4 sm:px-6">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="size-[13px]" />
            {t("share.title", "مشاركة")}
          </Button>
          {isOwner && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => navigate(`/products/${product.id}/edit`, { replace: true })}
              >
                <Pencil className="size-[13px]" />
                {t("admin.editListing", "تعديل")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => bumpMutation.mutate()}
                disabled={bumpMutation.isPending}
              >
                <RefreshCw className="size-[13px]" />
                {t("profile.update", "تحديث")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-destructive"
                onClick={() => {}}
              >
                <Trash2 className="size-[13px]" />
                {t("admin.deleteListing", "حذف")}
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />
      <ShareModal open={shareOpen} onOpenChange={setShareOpen} product={product} />
    </>
  )
}
