import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { X, Loader2, ChevronLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useMainCategories, useSubcategories } from "@/hooks/useCategories"
import { DynamicIcon } from "@/components/ui/DynamicIcon"
import { useAppDirection } from "@/providers/DirectionProvider"
import { OTHER_SUBCATEGORY_KEY, isOtherSubcategorySelection } from "@/lib/listings/subcategoryDerivedFields"
import {
  findSubcategoryPath,
  getSubcategoriesAtLevel,
  subHasChildren,
} from "@/lib/listings/subcategoryTree"

/**
 * Expandable inline category picker with multi-level subcategory drill-down.
 */
export function CategorySelector({
  categoryId,
  subcategoryId,
  subcategoryOther = "",
  subcategoryOtherError,
  onChange,
  onSubcategoryOtherChange,
  error,
}) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [expanded, setExpanded] = useState(false)
  const [drillStack, setDrillStack] = useState([])

  const { data: mainCategories = [], isLoading: loadingMain } = useMainCategories()
  const main = mainCategories.find((c) => String(c.id) === String(categoryId))
  const inlineRoots = main && Array.isArray(main.subcategories) ? main.subcategories : null
  const useInlineTree = inlineRoots !== null

  const remoteParentId = drillStack.length ? drillStack[drillStack.length - 1].id : null
  const remoteCategoryId = useInlineTree ? null : categoryId
  const { data: remoteSubs = [], isLoading: loadingRemote } = useSubcategories(
    remoteCategoryId,
    useInlineTree ? null : remoteParentId
  )

  const currentLevel = useInlineTree
    ? getSubcategoriesAtLevel(inlineRoots, drillStack)
    : remoteSubs

  const loadingSub = !useInlineTree && Boolean(categoryId) && loadingRemote

  useEffect(() => {
    setDrillStack([])
  }, [categoryId])

  useEffect(() => {
    if (!categoryId || !subcategoryId || isOtherSubcategorySelection(subcategoryId)) return
    if (!useInlineTree || !inlineRoots?.length) return
    const path = findSubcategoryPath(inlineRoots, subcategoryId)
    if (path.length > 1) {
      setDrillStack(path.slice(0, -1).map((n) => ({ id: n.id, name: n.name })))
    }
  }, [categoryId, subcategoryId, useInlineTree, inlineRoots])

  const isOther = isOtherSubcategorySelection(subcategoryId)
  const selectedPath = useMemo(() => {
    if (!main || isOther) return []
    if (useInlineTree && inlineRoots?.length && subcategoryId) {
      return findSubcategoryPath(inlineRoots, subcategoryId)
    }
    return []
  }, [main, isOther, useInlineTree, inlineRoots, subcategoryId])

  const handleMainClick = (id) => {
    onChange(id, null)
    onSubcategoryOtherChange?.("")
    setDrillStack([])
  }

  const finalizeSubcategory = (mainCatId, subId) => {
    onChange(mainCatId, subId)
    if (!isOtherSubcategorySelection(subId)) {
      onSubcategoryOtherChange?.("")
    }
    setExpanded(false)
  }

  const handleSubClick = (sub) => {
    if (!categoryId) return
    if (subHasChildren(sub)) {
      setDrillStack((prev) => [...prev, { id: sub.id, name: sub.name }])
      return
    }
    finalizeSubcategory(categoryId, sub.id)
  }

  const handleOtherClick = () => {
    if (!categoryId) return
    onChange(categoryId, OTHER_SUBCATEGORY_KEY)
    setExpanded(false)
  }

  const handleClear = () => {
    onChange(null, null)
    onSubcategoryOtherChange?.("")
    setDrillStack([])
  }

  const handleDrillBack = () => {
    setDrillStack((prev) => prev.slice(0, -1))
  }

  const breadcrumbParts = [
    main?.name,
    ...drillStack.map((n) => n.name),
  ].filter(Boolean)

  const displayText = main
    ? isOther
      ? `${main.name} — ${t("addListing.subcategoryOther")}${subcategoryOther?.trim() ? `: ${subcategoryOther.trim()}` : ""}`
      : selectedPath.length
        ? [main.name, ...selectedPath.map((n) => n.name)].join(" — ")
        : `${main.name}`
    : null

  const showOtherOption =
    Boolean(categoryId) && currentLevel.length > 0 && !currentLevel.some(subHasChildren)

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 sm:p-4 mb-2"
      dir={direction}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 text-start"
      >
        <span className="text-[14px] font-bold text-foreground">
          {t("addListing.categoryLabel")}
          <span className="text-destructive">*</span>
        </span>
        {displayText ? (
          <span className="flex-1 truncate text-start text-[14px] text-foreground">
            {displayText}
          </span>
        ) : (
          <span className="flex-1 truncate text-start text-[14px] text-muted-foreground">
            {t("addListing.categoryPlaceholder")}
          </span>
        )}
        <svg
          className={cn("size-4 shrink-0 transition-transform text-muted-foreground", expanded && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {displayText && !expanded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleClear()
          }}
          className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
          {t("addListing.clear")}
        </button>
      )}

      {expanded && (
        <div className="mt-3 flex border-t border-border pt-3">
          <div className="w-[40%] border-s border-border">
            <div className="bg-muted px-2.5 py-2.5 text-[13px] font-bold text-foreground">
              {t("addListing.categoryPlaceholder")}
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {loadingMain ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : (
                mainCategories.map((c) => {
                  const isSelected = String(categoryId) === String(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleMainClick(c.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-[14px] text-start transition-colors border-b border-border/50",
                        isSelected ? "border-e-[3px] border-e-primary bg-primary/10 text-primary" : "text-foreground"
                      )}
                    >
                      <DynamicIcon name={c.icon} className="size-4 shrink-0" />
                      {c.name}
                    </button>
                  )
                })
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 items-center gap-1 bg-muted px-2.5 py-2 text-[13px] font-bold text-foreground">
              {drillStack.length > 0 ? (
                <button
                  type="button"
                  onClick={handleDrillBack}
                  className="flex shrink-0 items-center gap-0.5 text-primary hover:underline"
                  aria-label={t("addListing.categoryDrillBack", "رجوع")}
                >
                  <ChevronLeft className="size-4 rtl:rotate-180" />
                </button>
              ) : null}
              <span className="min-w-0 truncate">
                {breadcrumbParts.length > 0
                  ? breadcrumbParts.join(" › ")
                  : t("addListing.categorySub")}
              </span>
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {loadingSub && categoryId ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : !categoryId ? (
                <p className="px-3 py-4 text-[14px] text-muted-foreground">
                  {t("addListing.categorySelectMain")}
                </p>
              ) : currentLevel.length === 0 ? (
                <p className="px-3 py-4 text-[14px] text-muted-foreground">
                  {t("addListing.noSubcategories", "لا توجد فروع")}
                </p>
              ) : (
                <>
                  {currentLevel.map((s) => {
                    const isSelected = String(subcategoryId) === String(s.id)
                    const hasChildren = subHasChildren(s)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSubClick(s)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-[14px] text-start transition-colors border-b border-border/50",
                          isSelected ? "bg-primary/10 text-primary" : "text-foreground"
                        )}
                      >
                        <span className="min-w-0 truncate">{s.name}</span>
                        {hasChildren ? (
                          <ChevronLeft className="size-4 shrink-0 rotate-180 rtl:rotate-0 text-muted-foreground" />
                        ) : null}
                      </button>
                    )
                  })}
                  {showOtherOption ? (
                    <button
                      type="button"
                      onClick={handleOtherClick}
                      className={cn(
                        "flex w-full items-center px-3 py-2.5 text-[14px] text-start transition-colors border-b border-border/50",
                        isOther ? "bg-primary/10 text-primary" : "text-foreground"
                      )}
                    >
                      {t("addListing.subcategoryOther")}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isOther ? (
        <div className="mt-3 border-t border-border pt-3">
          <label className="mb-2 block text-[13px] font-semibold text-foreground" htmlFor="subcategory-other-input">
            {t("addListing.subcategoryOtherPlaceholder")}
          </label>
          <Input
            id="subcategory-other-input"
            value={subcategoryOther}
            onChange={(e) => onSubcategoryOtherChange?.(e.target.value)}
            placeholder={t("addListing.subcategoryOtherPlaceholder")}
            className="h-10 text-sm"
            aria-invalid={Boolean(subcategoryOtherError)}
          />
          {subcategoryOtherError ? (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {subcategoryOtherError}
            </p>
          ) : null}
        </div>
      ) : null}

      {error && (
        <p className="mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
