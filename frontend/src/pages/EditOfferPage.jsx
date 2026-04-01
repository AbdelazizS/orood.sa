import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { ImageUpload } from "@/components/ImageUpload"
import { Loader2, ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

export function EditOfferPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token, user } = useAuthStore()

  const [type, setType] = useState("offer")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [condition, setCondition] = useState("new")
  const [warranty, setWarranty] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [subcategoryId, setSubcategoryId] = useState("")
  const [regionId, setRegionId] = useState("")
  const [cityId, setCityId] = useState("")
  const [imageUrls, setImageUrls] = useState([])
  const [acceptBids, setAcceptBids] = useState(false)
  const [bidsVisible, setBidsVisible] = useState(true)
  const [freeShipping, setFreeShipping] = useState(false)
  const [freeReturn, setFreeReturn] = useState(false)
  const [viewAtClient, setViewAtClient] = useState(false)
  const [contactPhone, setContactPhone] = useState(true)
  const [contactMessages, setContactMessages] = useState(true)
  const [isWholesale, setIsWholesale] = useState(false)
  const [wholesalePrice, setWholesalePrice] = useState("")
  const [minQuantity, setMinQuantity] = useState("")

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${id}`)
      return data?.data
    },
    enabled: Boolean(id) && Boolean(token),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return data?.data ?? []
    },
  })

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: async () => {
      if (!categoryId) return []
      const { data } = await apiClient.get(`/categories/${categoryId}/subcategories`)
      return data?.data ?? []
    },
    enabled: Boolean(categoryId),
  })

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? []
    },
  })

  useEffect(() => {
    if (!product) return
    if (product.seller?.id && user?.id && product.seller.id !== user.id) {
      navigate("/dashboard", { replace: true })
      return
    }
    setType(product.type ?? "offer")
    setTitle(product.title ?? "")
    setDescription(product.description ?? "")
    setPrice(product.price != null ? String(product.price) : "")
    setCondition(product.condition ?? "new")
    setWarranty(product.warranty ?? "")
    setCategoryId(product.category?.id ? String(product.category.id) : "")
    setSubcategoryId(product.subcategory?.id ? String(product.subcategory.id) : "")
    setRegionId(product.region?.id ? String(product.region.id) : "")
    setCityId(product.city?.id ? String(product.city.id) : "")
    const gallery = product.media?.gallery ?? (product.media?.image_url ? [product.media.image_url] : [])
    setImageUrls(gallery.filter(Boolean))
    setAcceptBids(product.accept_bids ?? false)
    setBidsVisible(product.bids_visible ?? true)
    const ship = product.shipping_details ?? {}
    setFreeShipping(ship.free_shipping ?? false)
    setFreeReturn(ship.free_return ?? false)
    setViewAtClient(ship.view_at_client ?? false)
    const contact = product.contact_preferences ?? {}
    setContactPhone(contact.phone ?? true)
    setContactMessages(contact.messages ?? true)
    setIsWholesale(product.is_wholesale ?? false)
    setWholesalePrice(product.wholesale_price != null ? String(product.wholesale_price) : "")
    setMinQuantity(product.min_quantity != null ? String(product.min_quantity) : "")
  }, [product, user?.id, navigate])

  const updateMutation = useMutation({
    mutationFn: (payload) => apiClient.put(`/products/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      queryClient.invalidateQueries({ queryKey: ["products", "mine"] })
      navigate(`/products/${id}`, { replace: true })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const urls = imageUrls.filter(Boolean)
    updateMutation.mutate({
      type,
      title,
      description,
      price: price ? parseFloat(price) : null,
      condition,
      warranty: condition === "used" ? (warranty || null) : null,
      category_id: categoryId ? Number(categoryId) : null,
      subcategory_id: subcategoryId ? Number(subcategoryId) : null,
      region_id: regionId ? Number(regionId) : null,
      city_id: cityId ? Number(cityId) : null,
      image_url: urls[0] || null,
      image_urls: urls,
      accept_bids: acceptBids,
      bids_visible: bidsVisible,
      free_shipping: freeShipping,
      free_return: freeReturn,
      view_at_client: viewAtClient,
      contact_phone: contactPhone,
      contact_messages: contactMessages,
      is_wholesale: isWholesale,
      wholesale_price: isWholesale && wholesalePrice ? parseFloat(wholesalePrice) : null,
      min_quantity: isWholesale && minQuantity ? parseInt(minQuantity, 10) : null,
    })
  }

  if (!token) {
    navigate("/login", { replace: true })
    return null
  }

  if (loadingProduct || !product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-start justify-center py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/products/${id}`}>
                <ArrowLeft className="size-4 rtl-rotate" />
              </Link>
            </Button>
            <div>
              <CardTitle className="text-2xl">{t("addOffer.editTitle", "Edit Listing")}</CardTitle>
              <CardDescription>{t("addOffer.editDescription", "Update your offer or request")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Tabs value={type} onValueChange={setType}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="offer">{t("feed.offer")}</TabsTrigger>
                <TabsTrigger value="request">{t("feed.request")}</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="title">{t("addOffer.titleLabel")}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("addOffer.descriptionLabel")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">{t("addOffer.priceLabel")}</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("addOffer.conditionLabel")}</Label>
                <Select value={condition} onValueChange={setCondition} disabled={updateMutation.isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">{t("feed.new")}</SelectItem>
                    <SelectItem value="used">{t("feed.used")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {condition === "used" && (
              <div className="space-y-2">
                <Label htmlFor="warranty">{t("addOffer.warrantyLabel")}</Label>
                <Input
                  id="warranty"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  placeholder="e.g. 30 days"
                  disabled={updateMutation.isPending}
                />
              </div>
            )}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isWholesale"
                  checked={isWholesale}
                  onChange={(e) => setIsWholesale(e.target.checked)}
                  disabled={updateMutation.isPending}
                  className="rounded"
                />
                <Label htmlFor="isWholesale">{t("wholesale.title", "Wholesale")}</Label>
              </div>
              {isWholesale && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("wholesale.price", "Wholesale price")}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(e.target.value)}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("wholesale.minQuantity", "Min. quantity")}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("addOffer.categoryLabel")}</Label>
                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategoryId("") }} disabled={updateMutation.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("addOffer.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("addOffer.subcategoryLabel")}</Label>
                <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={updateMutation.isPending || !categoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("addOffer.selectSubcategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("addOffer.regionLabel")}</Label>
                <Select value={regionId} onValueChange={(v) => { setRegionId(v); setCityId("") }} disabled={updateMutation.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("addOffer.selectRegion")} />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("addOffer.cityLabel")}</Label>
                <Select value={cityId} onValueChange={setCityId} disabled={updateMutation.isPending || !regionId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("addOffer.selectCity")} />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.find((r) => String(r.id) === regionId)?.cities?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    )) ?? []}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("addOffer.imagesLabel", "Images")}</Label>
              <ImageUpload
                value={imageUrls}
                onChange={setImageUrls}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="space-y-4 rounded-lg border p-4">
              <p className="font-medium">{t("addOffer.optionsLabel")}</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptBids}
                    onChange={(e) => setAcceptBids(e.target.checked)}
                    disabled={updateMutation.isPending}
                  />
                  {t("addOffer.acceptBids")}
                </label>
                {acceptBids && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={bidsVisible}
                      onChange={(e) => setBidsVisible(e.target.checked)}
                      disabled={updateMutation.isPending}
                    />
                    {t("addOffer.bidsVisible")}
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={freeShipping}
                    onChange={(e) => setFreeShipping(e.target.checked)}
                    disabled={updateMutation.isPending}
                  />
                  {t("addOffer.freeShipping")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={freeReturn}
                    onChange={(e) => setFreeReturn(e.target.checked)}
                    disabled={updateMutation.isPending}
                  />
                  {t("addOffer.freeReturn")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={viewAtClient}
                    onChange={(e) => setViewAtClient(e.target.checked)}
                    disabled={updateMutation.isPending}
                  />
                  {t("addOffer.viewAtClient")}
                </label>
              </div>
              <p className="text-sm text-muted-foreground">{t("addOffer.contactLabel")}</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={contactPhone}
                    onChange={(e) => setContactPhone(e.target.checked)}
                    disabled={updateMutation.isPending}
                  />
                  {t("addOffer.contactPhone")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={contactMessages}
                    onChange={(e) => setContactMessages(e.target.checked)}
                    disabled={updateMutation.isPending}
                  />
                  {t("addOffer.contactMessages")}
                </label>
              </div>
            </div>
            {updateMutation.isError && (
              <p className="text-sm text-destructive">
                {updateMutation.error?.response?.data?.message ?? t("common.error")}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("addOffer.saveChanges", "Save Changes")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
