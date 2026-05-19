import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Link } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"
import {
  createCompanyBulkOffer,
  createCompanyWholesaleProduct,
  deleteCompanyWholesaleProduct,
  fetchCompanyWholesaleProducts,
  updateCompanyWholesaleProduct,
} from "@/services/wholesaleService"
import { fetchUser, getMyCompanyStatus } from "@/services/authService"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Lightbulb } from "lucide-react"
import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"
import { CategorySelector } from "@/components/add-listing/CategorySelector"
import { LocationSelector } from "@/components/add-listing/LocationSelector"
import { ListingDetailsForm } from "@/components/add-listing/ListingDetailsForm"
import { WholesaleProductBuilderPreview } from "@/components/wholesale/WholesaleProductBuilderPreview"
import { CompanyWholesaleProductsTable } from "@/components/wholesale/CompanyWholesaleProductsTable"

function invalidateWholesaleProductQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["company", "wholesale", "products"] })
}

const initialProductForm = {
  title: "",
  description: "",
  original_price: "",
  discount_percent: 35,
  min_buyers: 3,
  category_id: "",
  subcategory_id: "",
  region_id: "",
  city_id: "",
  expires_at: "",
  image_urls: [],
}

const initialBulkForm = {
  title: "",
  description: "",
  discount_percent: 35,
  min_buyers: 3,
  valid_until: "",
  product_ids: [],
}

export function CompanyWholesalePage() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const [productForm, setProductForm] = useState(initialProductForm)
  const [bulkForm, setBulkForm] = useState(initialBulkForm)
  const [editingId, setEditingId] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [activeTab, setActiveTab] = useState("single")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const formRef = useRef(null)
  const dateLocale = i18n.language?.startsWith("ar") ? ar : enUS

  const companyStatusQuery = useQuery({
    queryKey: ["company", "my-status"],
    queryFn: getMyCompanyStatus,
    enabled: Boolean(hasHydrated && token),
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetchUser()
      .then(() => {
        if (cancelled) return
        queryClient.invalidateQueries({ queryKey: ["company", "my-status"] })
        invalidateWholesaleProductQueries(queryClient)
        queryClient.invalidateQueries({ queryKey: ["categories"] })
        queryClient.invalidateQueries({ queryKey: ["regions"] })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token, queryClient])

  const canManageWholesale =
    companyStatusQuery.data?.can_post_wholesale === true ||
    (user?.role === "company" && user?.company_verification_status === "approved")

  const productsQuery = useQuery({
    queryKey: ["company", "wholesale", "products", { page, perPage, search, status: statusFilter }],
    queryFn: () =>
      fetchCompanyWholesaleProducts({
        page,
        per_page: perPage,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
    enabled: Boolean(hasHydrated && token && canManageWholesale),
    placeholderData: (prev) => prev,
  })

  const productOptionsQuery = useQuery({
    queryKey: ["company", "wholesale", "products", "options"],
    queryFn: () => fetchCompanyWholesaleProducts({ per_page: 100, status: "published" }),
    enabled: Boolean(hasHydrated && token && canManageWholesale && activeTab === "bulk"),
  })

  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data])
  const productsMeta = useMemo(() => productsQuery.data?.meta ?? {}, [productsQuery.data])
  const productOptions = useMemo(
    () =>
      (productOptionsQuery.data?.data ?? []).map((product) => ({
        id: product.id,
        label: product.title,
      })),
    [productOptionsQuery.data],
  )

  const normalizedProductPayload = useMemo(
    () => ({
      ...productForm,
      title: productForm.title.trim(),
      description: productForm.description.trim(),
      original_price: Number(productForm.original_price || 0),
      discount_percent: Number(productForm.discount_percent || 0),
      min_buyers: Number(productForm.min_buyers || 0),
      category_id: Number(productForm.category_id || 0),
      subcategory_id: productForm.subcategory_id ? Number(productForm.subcategory_id) : null,
      region_id: productForm.region_id ? Number(productForm.region_id) : null,
      city_id: productForm.city_id ? Number(productForm.city_id) : null,
      expires_at: productForm.expires_at || null,
      image_urls: Array.from(new Set(productForm.image_urls)),
      status: "published",
    }),
    [productForm]
  )

  const buildProductPayload = (status) => ({
    ...normalizedProductPayload,
    status,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) {
        return updateCompanyWholesaleProduct(editingId, payload)
      }
      return createCompanyWholesaleProduct(payload)
    },
    onSuccess: () => {
      toast.success(t("wholesale.company.saveSuccess"))
      setProductForm(initialProductForm)
      setFieldErrors({})
      setEditingId(null)
      invalidateWholesaleProductQueries(queryClient)
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.company.saveError"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCompanyWholesaleProduct,
    onSuccess: () => {
      toast.success(t("wholesale.company.deleteSuccess"))
      invalidateWholesaleProductQueries(queryClient)
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.company.deleteError"))
    },
  })

  const bulkMutation = useMutation({
    mutationFn: createCompanyBulkOffer,
    onSuccess: () => {
      toast.success(t("wholesale.company.bulkSuccess"))
      setBulkForm(initialBulkForm)
      invalidateWholesaleProductQueries(queryClient)
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.company.bulkError"))
    },
  })

  const computedPrice = useMemo(() => {
    const original = Number(productForm.original_price || 0)
    const discount = Number(productForm.discount_percent || 0)
    if (original <= 0 || discount <= 0) return 0
    return Number((original * ((100 - discount) / 100)).toFixed(2))
  }, [productForm.original_price, productForm.discount_percent])

  const handleEdit = (product) => {
    setActiveTab("single")
    setEditingId(product.id)
    setProductForm({
      title: product.title ?? "",
      description: product.description ?? "",
      original_price: product.price ?? "",
      discount_percent: product.discount_percent ?? 35,
      min_buyers: product.min_quantity ?? 3,
      category_id: product.category?.id ? String(product.category.id) : "",
      subcategory_id: product.subcategory?.id ? String(product.subcategory.id) : "",
      region_id: product.region?.id ? String(product.region.id) : "",
      city_id: product.city?.id ? String(product.city.id) : "",
      expires_at: product.wholesale_expires_at ? String(product.wholesale_expires_at).slice(0, 10) : "",
      image_urls: product.media?.gallery ?? (product.media?.image_url ? [product.media.image_url] : []),
    })
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const submitProduct = () => {
    const errors = {}
    if (!productForm.category_id) errors.category = t("addListing.errors.categoryRequired")
    if (!productForm.region_id || !productForm.city_id) errors.location = t("addListing.errors.locationRequired")
    if (!productForm.title?.trim()) errors.title = t("addListing.errors.titleRequired")
    if (!productForm.description?.trim()) errors.description = t("addListing.errors.descriptionRequired")
    if (!(Number(productForm.original_price) > 0)) errors.price = t("addListing.errors.priceInvalid")
    if ((productForm.image_urls ?? []).length === 0) errors.imageUrls = t("addListing.errors.imagesRequired")
    if (!(Number(productForm.min_buyers) >= 2)) errors.min_buyers = t("wholesale.company.minBuyersRequired")
    if (!(Number(productForm.discount_percent) >= 1 && Number(productForm.discount_percent) <= 90)) {
      errors.discount_percent = t("wholesale.company.discountRangeError")
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    saveMutation.mutate(buildProductPayload("published"))
  }

  const saveDraft = () => {
    const errors = {}
    if (!productForm.title?.trim()) errors.title = t("addListing.errors.titleRequired")
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    saveMutation.mutate(buildProductPayload("pending_review"), {
      onSuccess: (res) => {
        const id = res?.data?.id
        if (id) setEditingId(id)
      },
    })
  }

  const openPublicPreview = () => {
    if (editingId) {
      window.open(`/wholesale/product/${editingId}`, "_blank", "noopener,noreferrer")
      return
    }
    saveMutation.mutate(buildProductPayload("pending_review"), {
      onSuccess: (res) => {
        const id = res?.data?.id
        if (id) {
          setEditingId(id)
          window.open(`/wholesale/product/${id}`, "_blank", "noopener,noreferrer")
        }
      },
    })
  }

  const submitBulk = () => {
    if (bulkForm.product_ids.length < 2) {
      toast.error(t("wholesale.company.minProductsError"))
      return
    }
    bulkMutation.mutate({
      title: bulkForm.title.trim(),
      description: bulkForm.description.trim() || null,
      discount_percent: Number(bulkForm.discount_percent || 0),
      min_buyers: Number(bulkForm.min_buyers || 0),
      valid_until: bulkForm.valid_until || null,
      product_ids: bulkForm.product_ids,
    })
  }

  if (!canManageWholesale) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("wholesale.company.title")}</CardTitle>
          <CardDescription>{t("wholesale.company.verificationRequired")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir={getDirection(i18n.language)}>
      <div>
        <h1 className="text-2xl font-bold">{t("wholesale.company.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("wholesale.company.subtitle")}</p>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/wholesale">{t("wholesale.company.openMarket")}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/wholesale/reservations">{t("wholesale.company.openReservations")}</Link>
          </Button>
        </div>
      </div>

      <Alert className="rounded-xl border-primary/25 bg-primary/5">
        <Lightbulb className="text-primary" aria-hidden />
        <AlertTitle>{t("wholesale.market.dashboardTips.title")}</AlertTitle>
        <AlertDescription className="text-muted-foreground">{t("wholesale.market.dashboardTips.body")}</AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="single" className="flex-1 min-w-[7rem]">
            {t("wholesale.company.singleTab")}
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex-1 min-w-[7rem]">
            {t("wholesale.company.bulkTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card ref={formRef}>
            <CardHeader>
              <CardTitle>{editingId ? t("wholesale.company.editProduct") : t("wholesale.company.newProduct")}</CardTitle>
              <CardDescription>
                {t("wholesale.company.newProductDesc")}
                <span className="mt-1 block text-xs">{t("wholesale.company.newProductGalleryHint")}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CategorySelector
                categoryId={productForm.category_id || null}
                subcategoryId={productForm.subcategory_id || null}
                error={fieldErrors.category}
                onChange={(categoryId, subcategoryId) =>
                  setProductForm((p) => ({
                    ...p,
                    category_id: categoryId ? String(categoryId) : "",
                    subcategory_id: subcategoryId ? String(subcategoryId) : "",
                  }))
                }
              />

              <LocationSelector
                regionId={productForm.region_id || null}
                cityId={productForm.city_id || null}
                error={fieldErrors.location}
                onChange={(regionId, cityId) =>
                  setProductForm((p) => ({
                    ...p,
                    region_id: regionId ? String(regionId) : "",
                    city_id: cityId ? String(cityId) : "",
                  }))
                }
              />

              <ListingDetailsForm
                title={productForm.title}
                description={productForm.description}
                imageUrls={productForm.image_urls}
                showPriceToggle={false}
                price={productForm.original_price}
                type="offer"
                errors={{
                  title: fieldErrors.title,
                  description: fieldErrors.description,
                  imageUrls: fieldErrors.imageUrls,
                  price: fieldErrors.price,
                }}
                onChange={(updates) => {
                  if ("title" in updates) setProductForm((p) => ({ ...p, title: updates.title ?? "" }))
                  if ("description" in updates) setProductForm((p) => ({ ...p, description: updates.description ?? "" }))
                  if ("imageUrls" in updates) setProductForm((p) => ({ ...p, image_urls: updates.imageUrls ?? [] }))
                  if ("price" in updates) setProductForm((p) => ({ ...p, original_price: String(updates.price ?? "") }))
                }}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("wholesale.fields.discountPercent")}</Label>
                  <Input type="number" value={productForm.discount_percent} onChange={(e) => setProductForm((p) => ({ ...p, discount_percent: Number(e.target.value || 0) }))} />
                  {fieldErrors.discount_percent ? <p className="text-sm text-destructive">{fieldErrors.discount_percent}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>{t("wholesale.fields.minBuyers")}</Label>
                  <Input type="number" value={productForm.min_buyers} onChange={(e) => setProductForm((p) => ({ ...p, min_buyers: Number(e.target.value || 0) }))} />
                  <p className="text-xs text-muted-foreground">{t("wholesale.company.groupSizeHint")}</p>
                  {fieldErrors.min_buyers ? <p className="text-sm text-destructive">{fieldErrors.min_buyers}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>{t("wholesale.fields.wholesalePrice")}</Label>
                  <Input value={computedPrice} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("wholesale.fields.expiresAt")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("w-full justify-between", !productForm.expires_at && "text-muted-foreground")}
                    >
                      {productForm.expires_at
                        ? format(new Date(productForm.expires_at), "PPP", { locale: dateLocale })
                        : t("wholesale.fields.pickDate")}
                      <CalendarIcon className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={productForm.expires_at ? new Date(productForm.expires_at) : undefined}
                      onSelect={(date) =>
                        setProductForm((p) => ({
                          ...p,
                          expires_at: date ? format(date, "yyyy-MM-dd") : "",
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={submitProduct} disabled={saveMutation.isPending}>
                  {editingId ? t("common.save") : t("wholesale.company.publish")}
                </Button>
                <Button type="button" variant="outline" onClick={saveDraft} disabled={saveMutation.isPending}>
                  {t("wholesale.company.saveDraft")}
                </Button>
                {editingId ? (
                  <>
                    <Button type="button" variant="outline" onClick={openPublicPreview} disabled={saveMutation.isPending}>
                      {t("wholesale.company.openPreview")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(null)
                        setProductForm(initialProductForm)
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <WholesaleProductBuilderPreview
            form={productForm}
            companyName={user?.company?.name ?? user?.name}
            user={user}
          />
          </div>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>{t("wholesale.company.bulkTitle")}</CardTitle>
              <CardDescription>{t("wholesale.company.bulkOfferDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("wholesale.fields.title")}</Label>
                  <Input value={bulkForm.title} onChange={(e) => setBulkForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("wholesale.fields.discountPercent")}</Label>
                  <Input type="number" value={bulkForm.discount_percent} onChange={(e) => setBulkForm((p) => ({ ...p, discount_percent: Number(e.target.value || 0) }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("wholesale.fields.description")}</Label>
                <Textarea value={bulkForm.description} onChange={(e) => setBulkForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("wholesale.fields.minBuyers")}</Label>
                  <Input type="number" value={bulkForm.min_buyers} onChange={(e) => setBulkForm((p) => ({ ...p, min_buyers: Number(e.target.value || 0) }))} />
                  <p className="text-xs text-muted-foreground">{t("wholesale.company.groupSizeHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t("wholesale.fields.validUntil")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-between", !bulkForm.valid_until && "text-muted-foreground")}
                      >
                        {bulkForm.valid_until
                          ? format(new Date(bulkForm.valid_until), "PPP", { locale: dateLocale })
                          : t("wholesale.fields.pickDate")}
                        <CalendarIcon className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bulkForm.valid_until ? new Date(bulkForm.valid_until) : undefined}
                        onSelect={(date) =>
                          setBulkForm((p) => ({
                            ...p,
                            valid_until: date ? format(date, "yyyy-MM-dd") : "",
                          }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>{t("wholesale.company.selectProducts")}</Label>
                <div className="flex flex-wrap gap-2">
                  {productOptions.map((option) => {
                    const selected = bulkForm.product_ids.includes(option.id)
                    return (
                      <Button
                        key={option.id}
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setBulkForm((prev) => ({
                            ...prev,
                            product_ids: selected
                              ? prev.product_ids.filter((id) => id !== option.id)
                              : [...prev.product_ids, option.id],
                          }))
                        }
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <Button onClick={submitBulk} disabled={bulkMutation.isPending}>
                {t("wholesale.company.publishBulk")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CompanyWholesaleProductsTable
        products={products}
        meta={productsMeta}
        isLoading={productsQuery.isLoading}
        isFetching={productsQuery.isFetching}
        page={page}
        perPage={perPage}
        search={search}
        statusFilter={statusFilter}
        onPageChange={setPage}
        onPerPageChange={(size) => {
          setPerPage(size)
          setPage(1)
        }}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        onStatusFilterChange={(value) => {
          setStatusFilter(value)
          setPage(1)
        }}
        onRefresh={() => productsQuery.refetch()}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
