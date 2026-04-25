import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Share2, Flag, Pencil, Save, Trash2, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProfileTopNav({
  isOwner,
  onShare,
  onReport,
  onEdit,
  onSave,
  onDelete,
  username,
  profileUrl,
}) {
  const accountHref = profileUrl ?? (username ? `/profile/${username}` : null)
  return (
    <div
      className={cn(
        "sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8"
      )}
    >
      <nav className="flex items-center gap-2 rtl:flex-row-reverse" aria-label="Breadcrumb">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          الرئيسية
        </Link>
        <ChevronRight size={14} className="rtl-rotate shrink-0 text-muted-foreground" aria-hidden />
        {accountHref ? (
          <Link
            to={accountHref}
            className="text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            الحساب
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">الحساب</span>
        )}
      </nav>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onShare}
        >
          <Share2 size={14} />
          مشاركة
        </Button>
        {!isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs hover:text-destructive"
            onClick={onReport}
          >
            <Flag size={14} />
            بلغ
          </Button>
        )}
        {isOwner && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={onEdit}
              asChild
            >
              <Link to={accountHref ?? "/dashboard"}>
                <Pencil size={14} />
                تعديل
              </Link>
            </Button>
            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={onSave}
              >
                <Save size={14} />
                حفظ
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 size={14} />
              حذف الحساب
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
