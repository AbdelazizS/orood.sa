import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import apiClient from "@/lib/apiClient"
import { ChevronDown, FolderTree, Search } from "lucide-react"

export function CategorySelector({ categoryId, subcategoryId, onChange, disabled }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(subcategoryId)

  useEffect(() => {
    setSelectedCategoryId(categoryId)
    setSelectedSubcategoryId(subcategoryId)
  }, [categoryId, subcategoryId])

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return data?.data ?? []
    },
  })

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return []
      const { data } = await apiClient.get(`/categories/${selectedCategoryId}/subcategories`)
      return data?.data ?? []
    },
    enabled: Boolean(selectedCategoryId),
  })

  const selectedCategory = categories.find((c) => c.id === (selectedSubcategoryId ? selectedCategoryId : categoryId))
  const selectedSubs = selectedCategory?.subcategories ?? subcategories
  const selectedSubcategory = selectedSubs.find(
    (s) => s.id === (selectedSubcategoryId ?? subcategoryId)
  )

  const displayValue = selectedCategory
    ? selectedSubcategory
      ? `${selectedCategory.name} › ${selectedSubcategory.name}`
      : selectedCategory.name
    : ""

  const filteredCategories = search
    ? categories.filter(
        (c) =>
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          subcategories.some((s) => s.name?.toLowerCase().includes(search.toLowerCase())),
      )
    : categories

  const handleSelectSubcategory = (catId, subId) => {
    setSelectedCategoryId(catId)
    setSelectedSubcategoryId(subId)
    onChange(catId, subId)
    setOpen(false)
    setSearch("")
  }

  const handleSelectCategoryOnly = (catId) => {
    const cat = categories.find((c) => c.id === catId)
    const subs = cat?.subcategories ?? []
    if (subs.length > 0) {
      setSelectedCategoryId(catId)
      setSelectedSubcategoryId(null)
    } else {
      handleSelectSubcategory(catId, null)
    }
  }

  return (
    <div className="space-y-2">
      <Label>{t("addOffer.categoryLabel")}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <FolderTree className="size-4 shrink-0 text-muted-foreground" />
              {displayValue || t("addProduct.selectCategory", "Select category")}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(400px,90vw)] p-0" align="start">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("addProduct.searchCategory", "Search categories...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
          <ScrollArea className="h-[280px]">
            <div className="p-2">
              {filteredCategories.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("common.noResults")}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredCategories.map((category) => {
                    const subs =
                      category.id === selectedCategoryId
                        ? category.subcategories ?? subcategories
                        : category.subcategories ?? []
                    const hasSubs = Array.isArray(subs) && subs.length > 0
                    const isCategoryMatch = selectedCategoryId === category.id && !selectedSubcategoryId

                    return (
                      <div key={category.id} className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            hasSubs ? handleSelectCategoryOnly(category.id) : handleSelectSubcategory(category.id, null)
                          }
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm transition-colors hover:bg-accent",
                            isCategoryMatch && "bg-accent font-medium",
                          )}
                        >
                          <FolderTree className="size-4 shrink-0 text-muted-foreground" />
                          {category.name}
                          {!hasSubs && (
                            <span
                              className={cn(
                                "ms-auto rounded px-2 py-0.5 text-xs",
                                isCategoryMatch ? "bg-primary text-primary-foreground" : "bg-muted",
                              )}
                            >
                              {t("addProduct.select", "Select")}
                            </span>
                          )}
                        </button>
                        {hasSubs &&
                          (selectedCategoryId === category.id || search) &&
                          subs.map((sub) => {
                            const isSubMatch =
                              selectedCategoryId === category.id && selectedSubcategoryId === sub.id

                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleSelectSubcategory(category.id, sub.id)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 ps-8 text-start text-sm transition-colors hover:bg-accent",
                                  isSubMatch && "bg-accent font-medium",
                                )}
                              >
                                {sub.name}
                                <span
                                  className={cn(
                                    "ms-auto rounded px-2 py-0.5 text-xs",
                                    isSubMatch ? "bg-primary text-primary-foreground" : "bg-muted",
                                  )}
                                >
                                  {t("addProduct.select", "Select")}
                                </span>
                              </button>
                            )
                          })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
