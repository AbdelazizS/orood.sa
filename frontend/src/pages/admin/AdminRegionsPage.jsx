import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
import { Checkbox } from "@/components/ui/checkbox"
import apiClient from "@/lib/apiClient"
import { LocalizedNameFields } from "@/components/admin/LocalizedNameFields"
import { ChevronDown, Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react"

export function AdminRegionsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [addRegionOpen, setAddRegionOpen] = useState(false)
  const [addCityRegion, setAddCityRegion] = useState(null)
  const [editingRegion, setEditingRegion] = useState(null)
  const [editingCity, setEditingCity] = useState(null)
  const [deleteRegion, setDeleteRegion] = useState(null)
  const [deleteCity, setDeleteCity] = useState(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [search])

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "regions", search, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("page", String(page))
      const res = await apiClient.get(`/admin/regions?${params}`)
      return res?.data ?? {}
    },
  })

  const regions = data?.data ?? []
  const meta = data?.meta ?? {}

  const createRegion = useMutation({
    mutationFn: (payload) => apiClient.post("/admin/regions", payload),
    onSuccess: () => {
      setAddRegionOpen(false)
      queryClient.refetchQueries({ queryKey: ["admin", "regions"] })
    },
  })

  const updateRegion = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/regions/${id}`, payload),
    onSuccess: () => {
      setEditingRegion(null)
      queryClient.refetchQueries({ queryKey: ["admin", "regions"] })
    },
  })

  const destroyRegion = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/regions/${id}`),
    onSuccess: () => {
      setDeleteRegion(null)
      queryClient.refetchQueries({ queryKey: ["admin", "regions"] })
    },
  })

  const createCity = useMutation({
    mutationFn: ({ regionId, payload }) => apiClient.post(`/admin/regions/${regionId}/cities`, payload),
    onSuccess: () => {
      setAddCityRegion(null)
      queryClient.refetchQueries({ queryKey: ["admin", "regions"] })
    },
  })

  const updateCity = useMutation({
    mutationFn: ({ regionId, cityId, payload }) =>
      apiClient.put(`/admin/regions/${regionId}/cities/${cityId}`, payload),
    onSuccess: () => {
      setEditingCity(null)
      queryClient.refetchQueries({ queryKey: ["admin", "regions"] })
    },
  })
  const toggleCityActive = useMutation({
    mutationFn: ({ regionId, cityId, isActive }) =>
      apiClient.put(`/admin/regions/${regionId}/cities/${cityId}`, { is_active: isActive }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["admin", "regions"] })
      queryClient.refetchQueries({ queryKey: ["regions"] })
    },
  })

  const destroyCity = useMutation({
    mutationFn: ({ regionId, cityId }) => apiClient.delete(`/admin/regions/${regionId}/cities/${cityId}`),
    onSuccess: () => {
      setDeleteCity(null)
      queryClient.refetchQueries({ queryKey: ["admin", "regions"] })
    },
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, is_active }) => apiClient.post("/admin/regions/bulk-update", { ids, is_active }),
    onSuccess: () => {
      setSelectedIds(new Set())
      queryClient.refetchQueries({ queryKey: ["admin", "regions"] })
    },
  })

  const bulkDestroyMutation = useMutation({
    mutationFn: (ids) => apiClient.post("/admin/regions/bulk-destroy", { ids }),
    onSuccess: () => {
      setSelectedIds(new Set())
      queryClient.refetchQueries({ queryKey: ["admin", "regions"] })
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
    if (selectedIds.size === regions.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(regions.map((r) => r.id)))
  }

  const selectedArray = Array.from(selectedIds)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("overview.manageRegions", "Manage Regions & Cities")}</h1>
          <p className="text-sm text-muted-foreground">{(meta.total ?? regions.length)} {t("admin.itemsTotal", "items")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.search", "Search...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 w-48"
            />
          </div>
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
          <Button onClick={() => setAddRegionOpen(true)}>
            <Plus className="me-2 size-4" />
            {t("regions.addRegion", "Add Region")}
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
                  checked={selectedIds.size === regions.length && regions.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">{t("categories.bulkSelect", "Select all")}</span>
              </div>
              {regions.map((region) => (
                <Collapsible key={region.id} defaultOpen>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(region.id)}
                          onCheckedChange={() => toggleSelect(region.id)}
                        />
                        <ChevronDown className="size-4" />
                        <span className="font-medium">{region.name}</span>
                        <Switch
                          checked={region.is_active ?? true}
                          onCheckedChange={(checked) => updateRegion.mutate({ id: region.id, payload: { is_active: checked } })}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm text-muted-foreground">
                          ({(region.cities ?? []).length} {t("regions.cities", "cities")})
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => setEditingRegion(region)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setAddCityRegion(region)}>
                          <Plus className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteRegion(region)} className="text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ps-8 pb-3 space-y-2">
                      {(region.cities ?? []).map((city) => (
                        <div
                          key={city.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2"
                        >
                          <span>{city.name}</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={city.is_active ?? true}
                              onCheckedChange={(checked) =>
                                toggleCityActive.mutate({ regionId: region.id, cityId: city.id, isActive: checked })
                              }
                            />
                            <Button variant="ghost" size="icon" onClick={() => setEditingCity({ ...city, regionId: region.id })}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteCity({ ...city, regionId: region.id })} className="text-destructive">
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
          {(meta.last_page ?? 1) > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {t("admin.pageOf", { current: meta.current_page ?? 1, total: meta.last_page ?? 1 })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="size-4 rtl:rotate-180" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(meta.last_page ?? 1, p + 1))} disabled={page >= (meta.last_page ?? 1)}>
                  <ChevronRight className="size-4 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {addRegionOpen && (
        <AddRegionDialog
          onClose={() => setAddRegionOpen(false)}
          onSubmit={(payload) => createRegion.mutate(payload)}
          isPending={createRegion.isPending}
        />
      )}
      {editingRegion && (
        <EditRegionDialog
          region={editingRegion}
          onClose={() => setEditingRegion(null)}
          onSubmit={(payload) => updateRegion.mutate({ id: editingRegion.id, payload })}
          isPending={updateRegion.isPending}
        />
      )}
      {deleteRegion && (
        <ConfirmDialog
          title={t("regions.deleteRegion", "Delete Region")}
          message={t("regions.deleteRegionConfirm", "Delete \"{{name}}\" and all its cities?", { name: deleteRegion.name })}
          onClose={() => setDeleteRegion(null)}
          onConfirm={() => destroyRegion.mutate(deleteRegion.id)}
          isPending={destroyRegion.isPending}
        />
      )}
      {addCityRegion && (
        <AddCityDialog
          region={addCityRegion}
          onClose={() => setAddCityRegion(null)}
          onSubmit={(payload) => createCity.mutate({ regionId: addCityRegion.id, payload })}
          isPending={createCity.isPending}
        />
      )}
      {editingCity && (
        <EditCityDialog
          city={editingCity}
          onClose={() => setEditingCity(null)}
          onSubmit={(payload) => updateCity.mutate({
            regionId: editingCity.regionId,
            cityId: editingCity.id,
            payload,
          })}
          isPending={updateCity.isPending}
        />
      )}
      {deleteCity && (
        <ConfirmDialog
          title={t("regions.deleteCity", "Delete City")}
          message={t("regions.deleteCityConfirm", "Delete \"{{name}}\"?", { name: deleteCity.name })}
          onClose={() => setDeleteCity(null)}
          onConfirm={() => destroyCity.mutate({ regionId: deleteCity.regionId, cityId: deleteCity.id })}
          isPending={destroyCity.isPending}
        />
      )}
    </div>
  )
}

function AddRegionDialog({ onClose, onSubmit, isPending }) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [nameAr, setNameAr] = useState("")
  const [nameEn, setNameEn] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("regions.addRegion", "Add Region")}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({ name, name_ar: nameAr || null, name_en: nameEn || null })
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
            nameLabel="regions.regionName"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="size-4 animate-spin" /> : t("regions.add", "Add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditRegionDialog({ region, onClose, onSubmit, isPending }) {
  const { t } = useTranslation()
  const [name, setName] = useState(region.name ?? "")
  const [nameAr, setNameAr] = useState(region.name_ar ?? "")
  const [nameEn, setNameEn] = useState(region.name_en ?? "")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("regions.editRegion", "Edit Region")}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({ name, name_ar: nameAr || null, name_en: nameEn || null })
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
            nameLabel="regions.regionName"
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

function AddCityDialog({ region, onClose, onSubmit, isPending }) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [nameAr, setNameAr] = useState("")
  const [nameEn, setNameEn] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("regions.addCityTo", "Add City to {{region}}", { region: region.name })}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({ name, name_ar: nameAr || null, name_en: nameEn || null })
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
            nameLabel="regions.cityName"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="size-4 animate-spin" /> : t("regions.add", "Add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditCityDialog({ city, onClose, onSubmit, isPending }) {
  const { t } = useTranslation()
  const [name, setName] = useState(city.name ?? "")
  const [nameAr, setNameAr] = useState(city.name_ar ?? "")
  const [nameEn, setNameEn] = useState(city.name_en ?? "")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("regions.editCity", "Edit City")}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({ name, name_ar: nameAr || null, name_en: nameEn || null })
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
            nameLabel="regions.cityName"
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
