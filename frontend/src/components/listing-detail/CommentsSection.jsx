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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { resolveImageUrl } from "@/lib/imageUrl"
import { toast } from "sonner"
import { timeAgo } from "@/lib/timeAgo"
import {
  useDeleteComment,
  useEditComment,
  useListingComments,
  usePostComment,
  useToggleCommentVisibility,
} from "@/hooks/useComments"
import {
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  MoreVertical,
  Share2,
  Flag,
  Eye,
  EyeOff,
} from "lucide-react"
import { ShareModal } from "./ShareModal"
import { ListingReportDialog } from "./ListingReportDialog"

/**
 * Section 8 — Comments (PDF): title row → list → textarea → send → owner tools row (owner only).
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
  const [replyingToId, setReplyingToId] = useState(null)
  const [replyText, setReplyText] = useState("")
  const [shareOpen, setShareOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [deleteListingOpen, setDeleteListingOpen] = useState(false)

  const isOwner = token && (user?.id === product?.seller?.id || user?.id === product?.user_id)
  const { data, isLoading: commentsLoading } = useListingComments(product?.id)
  const comments = useMemo(() => data?.comments ?? [], [data])
  const bidsPubliclyVisible = data?.meta?.bidding_visible ?? true

  const postComment = usePostComment(product?.id)
  const deleteComment = useDeleteComment()
  const editComment = useEditComment()
  const toggleVisibility = useToggleCommentVisibility()

  const bumpMutation = useMutation({
    mutationFn: () => apiClient.post(`/products/${product.id}/bump`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", product.id] })
      toast.success(t("listingDetail.bumpSuccess", "تم تحديث ظهور الإعلان"))
    },
    onError: () => toast.error(t("common.errorGeneric", "حدث خطأ")),
  })

  const listingStatus = product?.status ?? "ACTIVE"
  const sellerCanToggleVisibility = ["ACTIVE", "HIDDEN", "PENDING_REVIEW", "DRAFT"].includes(listingStatus)

  const toggleVisibilityMutation = useMutation({
    mutationFn: (newStatus) =>
      apiClient.patch(`/dashboard/listings/${product.id}/status`, { status: newStatus }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["product", product.id] })
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
      toast.success(res?.data?.message ?? t("dashboard.listingsToast.updated"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("dashboard.listingsToast.error"))
    },
  })

  const deleteListingMutation = useMutation({
    mutationFn: () => apiClient.delete(`/products/${product.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setDeleteListingOpen(false)
      toast.success(t("admin.deleteSuccess", "تم الحذف"))
      navigate("/dashboard/listings", { replace: true })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("admin.deleteError", "تعذر حذف الإعلان"))
    },
  })

  const regularItems = useMemo(
    () => comments.filter((c) => c.type === "REGULAR").sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [comments]
  )
  const bidItems = useMemo(
    () =>
      comments
        .filter((c) => c.type === "BID")
        .filter(() => bidsPubliclyVisible || isOwner)
        .sort((a, b) => (Number(a.bid_amount ?? 0) - Number(b.bid_amount ?? 0)) || (new Date(a.created_at) - new Date(b.created_at))),
    [bidsPubliclyVisible, comments, isOwner]
  )
  const allItems = useMemo(() => {
    // When bidding is enabled, bids are shown only in BidSection (API); hide BID comment duplicates here.
    const bidStream = product?.accept_bids ? [] : bidItems
    const merged = [...regularItems, ...bidStream]
    return merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [regularItems, bidItems, product?.accept_bids])
  const getDisplayName = (person) => {
    const username = person?.username?.trim()
    if (username) return username
    const name = person?.name?.trim()
    if (name) return name
    return t("comments.guest", "زائر")
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!commentText.trim() || !token) return
    postComment.mutate({ body: commentText.trim() }, { onSuccess: () => setCommentText("") })
  }

  const handleReplySubmit = (commentId) => {
    if (!token || !replyText.trim()) return
    postComment.mutate(
      { body: replyText.trim(), parent_id: commentId },
      {
        onSuccess: () => {
          setReplyText("")
          setReplyingToId(null)
        },
      }
    )
  }

  return (
    <>
      <div dir={direction} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <h3 className="text-sm font-semibold text-foreground">
          {t("comments.title", "التعليقات")}
        </h3>
        {!isOwner ? (
          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => setShareOpen(true)}>
              <Share2 className="size-[13px]" />
              {t("share.title", "مشاركة")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="size-[13px]" />
              {t("common.report", "بلاغ")}
            </Button>
          </div>
        ) : null}
      </div>

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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {t("bids.commentTag")}
                    </span>
                    <span className="mt-1 text-sm font-bold text-primary">
                      {Math.round(Number(item.bid_amount ?? 0)).toLocaleString()} {t("common.currency", "ريال")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(item.created_at, t)}
                    </span>
                    <span className="text-sm font-semibold">
                      {getDisplayName(item.user)}
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
                        {getDisplayName(item.user).charAt(0)}
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
                    <span className="text-sm font-semibold">{getDisplayName(item.user)}</span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(item.created_at, t)}
                    </span>
                    {item.is_hidden_for_viewer && (
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {t("comments.hidden", "Hidden")}
                      </span>
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
                          {t("common.save", "Save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          {t("common.cancel", "Cancel")}
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
                          <p className="text-xs font-semibold text-primary">
                            {r.type === "TEAM_REPLY"
                              ? t("comments.team", "فريق المنصة")
                              : getDisplayName(r.user)}
                          </p>
                          <p className="mt-0.5 text-sm text-foreground">{r.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {token && (
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          if (replyingToId === item.id) {
                            setReplyingToId(null)
                            setReplyText("")
                            return
                          }
                          setReplyingToId(item.id)
                          setReplyText("")
                        }}
                      >
                        {t("comments.reply", "رد")}
                      </Button>
                    </div>
                  )}
                  {token && replyingToId === item.id && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        dir={direction}
                        className="resize-none text-sm"
                        placeholder={t("comments.replyingTo", "الرد على تعليق")}
                      />
                      <div className="flex gap-2 rtl:flex-row-reverse">
                        <Button
                          size="sm"
                          onClick={() => handleReplySubmit(item.id)}
                          disabled={!replyText.trim() || postComment.isPending}
                        >
                          {t("comments.post", "إرسال")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReplyingToId(null)
                            setReplyText("")
                          }}
                        >
                          {t("common.cancel", "إلغاء")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {token && (
                  <div className="ms-2 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          aria-label={t("comments.actionsMenu", "Comment actions")}
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
                              {t("comments.edit", "Edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteComment.mutate({ id: item.id, listingId: product.id })}
                            >
                              {t("comments.delete", "Delete")}
                            </DropdownMenuItem>
                          </>
                        )}
                        {isOwner && (
                          <>
                            <DropdownMenuItem
                              onClick={() => toggleVisibility.mutate({ id: item.id, listingId: product.id })}
                            >
                              {item.is_visible === false
                                ? t("comments.show", "Show")
                                : t("comments.hide", "Hide")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteComment.mutate({ id: item.id, listingId: product.id })}
                            >
                              {t("comments.delete", "Delete")}
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

      {isOwner && (
        <div dir={direction} className="space-y-2 border-t border-border px-4 pb-4 pt-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-start gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              onClick={() => setDeleteListingOpen(true)}
            >
              <Trash2 className="me-1 size-[13px]" />
              {t("admin.deleteListing", "حذف")}
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
              className="gap-1 text-xs"
              onClick={() => navigate(`/products/${product.id}/edit`, { replace: true })}
            >
              <Pencil className="size-[13px]" />
              {t("admin.editListing", "تعديل")}
            </Button>
            {listingStatus !== "SOLD" && sellerCanToggleVisibility ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                disabled={toggleVisibilityMutation.isPending}
                onClick={() =>
                  toggleVisibilityMutation.mutate(listingStatus === "ACTIVE" ? "HIDDEN" : "ACTIVE")
                }
              >
                {listingStatus === "ACTIVE" ? (
                  <EyeOff className="size-[13px]" />
                ) : (
                  <Eye className="size-[13px]" />
                )}
                {listingStatus === "ACTIVE"
                  ? t("dashboard.listingHide", "إخفاء")
                  : t("dashboard.listingShow", "إظهار")}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShareOpen(true)}>
              <Share2 className="size-[13px]" />
              {t("share.title", "مشاركة")}
            </Button>
          </div>
        </div>
      )}

      <ShareModal open={shareOpen} onOpenChange={setShareOpen} product={product} />
      <ListingReportDialog open={reportOpen} onOpenChange={setReportOpen} listingId={product?.id} />

      <AlertDialog open={deleteListingOpen} onOpenChange={setDeleteListingOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteConfirm", "حذف العرض؟")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.deleteConfirmDesc", "لا يمكن التراجع عن هذا الإجراء.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "إلغاء")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteListingMutation.isPending}
              onClick={() => deleteListingMutation.mutate()}
            >
              {deleteListingMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("profile.delete", "حذف")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Separator />
    </>
  )
}
