import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import apiClient from "@/lib/apiClient"
import { LocalizedNameFields } from "@/components/admin/LocalizedNameFields"
import { ChevronDown, Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react"

export function AdminCategoriesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [regionFilter, setRegionFilter] = useState("all")
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [addSubcategoryCategory, setAddSubcategoryCategory] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingSubcategory, setEditingSubcategory] = useState(null)
  const [deleteCategory, setDeleteCategory] = useState(null)
  const [deleteSubcategory, setDeleteSubcategory] = useState(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/categories")
      return data?.data ?? []
    },
  })

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? []
    },
  })

  const filteredCategories =
    regionFilter && regionFilter !== "all"
      ? categories.filter((c) =>
          (c.regions ?? []).some((r) => Number(r.id) === Number(regionFilter) && (r.pivot?.is_visible ?? true))
        )
      : categories

  const createCategory = useMutation({
    mutationFn: (payload) => apiClient.post("/admin/categories", payload),
    onSuccess: () => {
      setAddCategoryOpen(false)
      queryClient.refetchQueries({ queryKey: ["admin", "categories"] })
      toast.success(t("admin.updateSuccess", "تمت الإضافة بنجاح"))
    },
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/categories/${id}`, payload),
    onSuccess: () => {
      setEditingCategory(null)
      queryClient.refetchQueries({ queryKey: ["admin", "categories"] })
      toast.success(t("admin.updateSuccess", "تم التحديث بنجاح"))
    },
  })

  const destroyCategory = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      setDeleteCategory(null)
      queryClient.refetchQueries({ queryKey: ["admin", "categories"] })
    },
  })

  const toggleRegion = useMutation({
    mutationFn: ({ categoryId, regionId, isVisible }) =>
      apiClient.post(`/admin/categories/${categoryId}/regions/${regionId}/toggle`, { is_visible: isVisible }),
    onSuccess: () => queryClient.refetchQueries({ queryKey: ["admin", "categories"] }),
  })

  const createSubcategory = useMutation({
    mutationFn: ({ categoryId, payload }) =>
      apiClient.post(`/admin/categories/${categoryId}/subcategories`, payload),
    onSuccess: () => {
      setAddSubcategoryCategory(null)
      queryClient.refetchQueries({ queryKey: ["admin", "categories"] })
    },
  })

  const updateSubcategory = useMutation({
    mutationFn: ({ categoryId, subcategoryId, payload }) =>
      apiClient.put(`/admin/categories/${categoryId}/subcategories/${subcategoryId}`, payload),
    onSuccess: () => {
      setEditingSubcategory(null)
      queryClient.refetchQueries({ queryKey: ["admin", "categories"] })
    },
  })

  const destroySubcategory = useMutation({
    mutationFn: ({ categoryId, subcategoryId }) =>
      apiClient.delete(`/admin/categories/${categoryId}/subcategories/${subcategoryId}`),
    onSuccess: () => {
      setDeleteSubcategory(null)
      queryClient.refetchQueries({ queryKey: ["admin", "categories"] })
    },
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, is_active }) => apiClient.post("/admin/categories/bulk-update", { ids, is_active }),
    onSuccess: () => {
      setSelectedIds(new Set())
      queryClient.refetchQueries({ queryKey: ["admin", "categories"] })
    },
  })

  const bulkDestroyMutation = useMutation({
    mutationFn: (ids) => apiClient.post("/admin/categories/bulk-destroy", { ids }),
    onSuccess: () => {
      setSelectedIds(new Set())
      queryClient.refetchQueries({ queryKey: ["admin", "categories"] })
    },
  })

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCategories.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredCategories.map((c) => c.id)))
  }

  const selectedArray = Array.from(selectedIds)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("categories.manageCategories", "إدارة الأقسام")}</h1>
        <div className="flex items-center gap-2">
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <MapPin className="me-2 size-4 text-muted-foreground" />
              <SelectValue placeholder={t("addOffer.regionLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedArray.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkUpdateMutation.mutate({ ids: selectedArray, is_active: true })}
                disabled={bulkUpdateMutation.isPending}
              >
                {t("categories.activate", "Activate")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkUpdateMutation.mutate({ ids: selectedArray, is_active: false })}
                disabled={bulkUpdateMutation.isPending}
              >
                {t("categories.deactivate", "Deactivate")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => bulkDestroyMutation.mutate(selectedArray)}
                disabled={bulkDestroyMutation.isPending}
              >
                {t("categories.bulkDelete", "Delete")}
              </Button>
            </>
          )}
          <Button onClick={() => setAddCategoryOpen(true)}>
            <Plus className="me-2 size-4" />
            {t("categories.addCategory", "إضافة قسم")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y">
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
                <Checkbox
                  checked={selectedIds.size === filteredCategories.length && filteredCategories.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">{t("categories.bulkSelect", "تحديد الكل")}</span>
              </div>
              {filteredCategories.map((category) => (
                <Collapsible key={category.id} defaultOpen>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(category.id)}
                          onCheckedChange={() => toggleSelect(category.id)}
                        />
                        <ChevronDown className="size-4" />
                        <span className="font-medium">{category.name_ar || category.name}</span>
                        <Switch
                          checked={category.is_active ?? true}
                          onCheckedChange={(checked) => updateCategory.mutate({ id: category.id, payload: { is_active: checked } })}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm text-muted-foreground">
                          ({(category.subcategories ?? []).length} {t("categories.subcategories", "subcategories")})
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => setEditingCategory(category)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setAddSubcategoryCategory(category)}>
                          <Plus className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteCategory(category)} className="text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ps-8 pb-3 space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">{t("categories.subcategories", "Subcategories")}</p>
                        <div className="space-y-2">
                          {(category.subcategories ?? []).map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between rounded-lg border px-3 py-2"
                            >
                              <span>{sub.name_ar || sub.name}</span>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setEditingSubcategory({ ...sub, categoryId: category.id })}>
                                  <Pencil className="size-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteSubcategory({ ...sub, categoryId: category.id })} className="text-destructive">
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">{t("categories.regionVisibility", "Region visibility")}</p>
                        <div className="flex flex-wrap gap-2">
                          {(category.regions ?? []).map((region) => (
                            <div
                              key={region.id}
                              className="flex items-center gap-2 rounded-lg border px-3 py-2"
                            >
                              <span className="text-sm">{region.name}</span>
                              <Switch
                                checked={region.pivot?.is_visible ?? true}
                                onCheckedChange={(checked) =>
                                  toggleRegion.mutate({ categoryId: category.id, regionId: region.id, isVisible: checked })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {addCategoryOpen && (
        <LocalizedDialog
          title={t("categories.addCategory", "Add Category")}
          onSubmit={(payload) => createCategory.mutate(payload)}
          onClose={() => setAddCategoryOpen(false)}
          isPending={createCategory.isPending}
        />
      )}
      {editingCategory && (
        <LocalizedDialog
          title={t("categories.editCategory", "Edit Category")}
          initial={{ name: editingCategory.name, name_ar: editingCategory.name_ar, name_en: editingCategory.name_en }}
          onSubmit={(payload) => updateCategory.mutate({ id: editingCategory.id, payload })}
          onClose={() => setEditingCategory(null)}
          isPending={updateCategory.isPending}
        />
      )}
      {deleteCategory && (
        <ConfirmDialog
          title={t("categories.deleteCategory", "Delete Category")}
          message={`Delete "${deleteCategory.name}" and all subcategories?`}
          onClose={() => setDeleteCategory(null)}
          onConfirm={() => destroyCategory.mutate(deleteCategory.id)}
          isPending={destroyCategory.isPending}
        />
      )}
      {addSubcategoryCategory && (
        <LocalizedDialog
          title={`${t("categories.addSubcategory", "Add Subcategory")} - ${addSubcategoryCategory.name}`}
          onSubmit={(payload) => createSubcategory.mutate({ categoryId: addSubcategoryCategory.id, payload })}
          onClose={() => setAddSubcategoryCategory(null)}
          isPending={createSubcategory.isPending}
        />
      )}
      {editingSubcategory && (
        <LocalizedDialog
          title={t("categories.editSubcategory", "Edit Subcategory")}
          initial={{ name: editingSubcategory.name, name_ar: editingSubcategory.name_ar, name_en: editingSubcategory.name_en }}
          onSubmit={(payload) => updateSubcategory.mutate({
            categoryId: editingSubcategory.categoryId,
            subcategoryId: editingSubcategory.id,
            payload,
          })}
          onClose={() => setEditingSubcategory(null)}
          isPending={updateSubcategory.isPending}
        />
      )}
      {deleteSubcategory && (
        <ConfirmDialog
          title={t("categories.deleteSubcategory", "Delete Subcategory")}
          message={`Delete "${deleteSubcategory.name}"?`}
          onClose={() => setDeleteSubcategory(null)}
          onConfirm={() => destroySubcategory.mutate({
            categoryId: deleteSubcategory.categoryId,
            subcategoryId: deleteSubcategory.id,
          })}
          isPending={destroySubcategory.isPending}
        />
      )}
    </div>
  )
}

function LocalizedDialog({ title, initial = {}, onSubmit, onClose, isPending }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial.name ?? "")
  const [nameAr, setNameAr] = useState(initial.name_ar ?? "")
  const [nameEn, setNameEn] = useState(initial.name_en ?? "")
  useEffect(() => {
    setName(initial.name ?? "")
    setNameAr(initial.name_ar ?? "")
    setNameEn(initial.name_en ?? "")
  }, [initial.name, initial.name_ar, initial.name_en])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const payload = { name, name_ar: nameAr || null, name_en: nameEn || null }
            onSubmit(payload)
          }}
          className="space-y-4"
        >
          <LocalizedNameFields
            name={name}
            nameAr={nameAr}
            nameEn={nameEn}
            onNameChange={setName}
            onNameArChange={setNameAr}
            onNameEnChange={setNameEn}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({ title, message, onClose, onConfirm, isPending }) {
  const { t } = useTranslation()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p>{message}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : t("categories.delete", "Delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
