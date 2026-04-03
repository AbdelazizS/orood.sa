import { useState } from "react"
import { ChevronDown, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMainCategories } from "@/hooks/useCategories"
import { useSubcategories } from "@/hooks/useCategories"

export default function CategoryPicker({ form }) {
  const [isOpen, setIsOpen] = useState(false)
  const mainCategoryId = form.watch("mainCategoryId")
  const [selectedMainId, setSelectedMainId] = useState(mainCategoryId || "")

  const { data: mainCats = [], isLoading: loadingMain } = useMainCategories()
  const { data: subCats = [], isLoading: loadingSub } = useSubcategories(selectedMainId)

  const subCategoryId = form.watch("subCategoryId")

  const selectedMain = mainCats.find((c) => c.id === mainCategoryId || String(c.id) === String(mainCategoryId))
  const selectedSub = subCats.find((c) => c.id === subCategoryId || String(c.id) === String(subCategoryId))

  const handleSelectMain = (cat) => {
    setSelectedMainId(String(cat.id))
    form.setValue("mainCategoryId", String(cat.id), { shouldValidate: true })
    form.setValue("subCategoryId", "", { shouldValidate: false })
  }

  const handleSelectSub = (sub) => {
    form.setValue("subCategoryId", String(sub.id), { shouldValidate: true })
    setIsOpen(false)
  }

  const handleOpen = () => {
    if (!isOpen && mainCategoryId) setSelectedMainId(String(mainCategoryId))
    setIsOpen((o) => !o)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    setSelectedMainId("")
    form.setValue("mainCategoryId", "")
    form.setValue("subCategoryId", "")
  }

  const name = (cat) => cat?.nameAr ?? cat?.name ?? ""

  return (
    <FormField
      control={form.control}
      name="mainCategoryId"
      render={() => (
        <FormItem className="px-4 py-3 sm:px-6 lg:px-8">
          <label className="block text-sm font-medium text-foreground text-right mb-2">
            القسم <span className="text-destructive">*</span>
          </label>
          <div
            onClick={handleOpen}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              "border-2 rounded-2xl px-4 py-3 transition-all shadow-sm",
              "hover:border-primary/50 hover:bg-accent/50",
              isOpen ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <ChevronDown
              size={16}
              className={cn(
                "text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
            {selectedMain && selectedSub ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
                <span className="text-sm text-foreground">{name(selectedSub)}</span>
                <span className="text-muted-foreground text-sm">—</span>
                <span className="text-sm text-foreground">{name(selectedMain)}</span>
                <span>{selectedMain.icon}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">اختر القسم الرئيسي والفرعي</span>
            )}
          </div>

          {isOpen && (
            <div className="border-2 border-border rounded-2xl overflow-hidden mt-3 shadow-md">
              <div className="grid grid-cols-2 border-b border-border bg-muted/40">
                <div className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground border-e border-border">
                  الأقسام الفرعية
                </div>
                <div className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                  الأقسام الرئيسية
                </div>
              </div>

              <div className="grid grid-cols-2 h-64">
                <ScrollArea className="h-full border-e border-border">
                  {loadingSub && selectedMainId ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : !selectedMainId ? (
                    <div className="flex items-center justify-center h-full px-3">
                      <p className="text-xs text-muted-foreground text-center">
                        اختر قسماً رئيسياً أولاً
                      </p>
                    </div>
                  ) : (
                    subCats.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectSub(sub)}
                        className={cn(
                          "w-full text-right px-3 py-2.5 text-sm",
                          "border-b border-border/40 last:border-0",
                          "hover:bg-accent transition-colors",
                          subCategoryId === sub.id || String(subCategoryId) === String(sub.id)
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-foreground"
                        )}
                      >
                        {name(sub)}
                      </button>
                    ))
                  )}
                </ScrollArea>

                <ScrollArea className="h-full">
                  {loadingMain ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    mainCats.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectMain(cat)}
                        className={cn(
                          "w-full text-right px-3 py-2.5 text-sm",
                          "border-b border-border/40 last:border-0",
                          "hover:bg-accent transition-colors",
                          "flex items-center justify-end gap-2",
                          selectedMainId === cat.id || String(selectedMainId) === String(cat.id)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground"
                        )}
                      >
                        <span>{name(cat)}</span>
                        <span>{cat.icon}</span>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </div>

              <div className="border-t border-border px-3 py-1.5 bg-muted/30 text-center">
                <span className="text-xs text-muted-foreground">
                  كل قسم رئيسي له قائمة فرعية
                </span>
              </div>
            </div>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  )
}
