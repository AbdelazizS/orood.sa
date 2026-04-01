import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { parseAddListingErrors } from "@/lib/addListingErrors"
import { TypeSelector } from "@/components/add-listing/TypeSelector"
import { CategorySelector } from "@/components/add-listing/CategorySelector"
import { LocationSelector } from "@/components/add-listing/LocationSelector"
import { ListingDetailsForm } from "@/components/add-listing/ListingDetailsForm"
import { OptionsCheckboxes } from "@/components/add-listing/OptionsCheckboxes"
import { BiddingOptions } from "@/components/add-listing/BiddingOptions"
import { SubmitSection } from "@/components/add-listing/SubmitSection"

/**
 * Add Offer/Request page — اضف عرض او طلب
 * Exact design match: white boxes on #f5f5f5, RTL, teal accents.
 */
export function AddOfferPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuthStore()

  const [type, setType] = useState("offer")
  const [categoryId, setCategoryId] = useState(null)
  const [subcategoryId, setSubcategoryId] = useState(null)
  const [regionId, setRegionId] = useState(null)
  const [cityId, setCityId] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrls, setImageUrls] = useState([])
  const [price, setPrice] = useState("1000")
  const [includeTax, setIncludeTax] = useState(false)
  const [freeShipping, setFreeShipping] = useState(false)
  const [freeReturn, setFreeReturn] = useState(false)
  const [allowViewLocation, setAllowViewLocation] = useState(false)
  const [bidEnabled, setBidEnabled] = useState(false)
  const [bidVisible, setBidVisible] = useState(true)
  const [contactMessages, setContactMessages] = useState(true)
  const [contactPhone, setContactPhone] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const formRef = useRef(null)

  useEffect(() => {
    const dup = location.state?.duplicateFrom
    if (!dup) return
    if (dup.title) setTitle(dup.title)
    if (dup.description) setDescription(dup.description)
    if (dup.price != null) setPrice(String(dup.price))
    if (dup.type) setType(dup.type === "request" ? "request" : "offer")
    if (dup.accept_bids != null) setBidEnabled(!!dup.accept_bids)
    if (dup.bids_visible != null) setBidVisible(!!dup.bids_visible)
    if (dup.category_id) setCategoryId(dup.category_id)
    if (dup.subcategory_id) setSubcategoryId(dup.subcategory_id)
    if (dup.region_id) setRegionId(dup.region_id)
    if (dup.city_id) setCityId(dup.city_id)
    const cp = dup.contact_preferences ?? {}
    if (cp.messages != null) setContactMessages(cp.messages)
    if (cp.phone != null) setContactPhone(cp.phone)
    const sd = dup.shipping_details ?? {}
    if (sd.view_at_client != null) setAllowViewLocation(sd.view_at_client)
  }, [location.state?.duplicateFrom])

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/products", payload),
    onSuccess: () => navigate("/", { replace: true }),
    onError: (err) => {
      setFieldErrors(parseAddListingErrors(err, t))
    },
  })

  const isValidUrl = (url) =>
    typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))

  const validate = () => {
    const err = {}
    if (!categoryId) err.category = t("addListing.errors.categoryRequired")
    if (!regionId || !cityId) err.location = t("addListing.errors.locationRequired")
    if (!title?.trim()) err.title = t("addListing.errors.titleRequired")
    if (!description?.trim()) err.description = t("addListing.errors.descriptionRequired")
    const validUrls = (imageUrls || []).filter(isValidUrl)
    if (type === "offer" && validUrls.length === 0) {
      err.imageUrls = t("addListing.errors.imagesRequired")
    }
    setFieldErrors(err)
    if (Object.keys(err).length > 0) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    return Object.keys(err).length === 0
  }

  const clearFieldError = (key) =>
    setFieldErrors((e) => {
      const next = { ...e }
      delete next[key]
      return next
    })

  const handleSubmit = () => {
    setFieldErrors({})
    if (!validate()) return

    const validUrls = (imageUrls || []).filter(isValidUrl)
    const payload = {
      type,
      title: title.trim(),
      description: description.trim(),
      price: price ? parseFloat(price) : null,
      category_id: categoryId ?? null,
      subcategory_id: subcategoryId ?? null,
      region_id: regionId ?? null,
      city_id: cityId ?? null,
      image_url: validUrls[0] || null,
      image_urls: validUrls,
      accept_bids: bidEnabled,
      bids_visible: bidEnabled ? bidVisible : true,
      view_at_client: allowViewLocation,
      contact_phone: contactPhone,
      contact_messages: contactMessages,
      free_shipping: freeShipping,
      free_return: freeReturn,
    }
    createMutation.mutate(payload)
  }

  if (!token) {
    navigate("/login", { replace: true })
    return null
  }

  const hasErrors = Object.keys(fieldErrors).length > 0

  return (
    <div ref={formRef} className="px-4 py-6 sm:px-6 sm:py-8 bg-muted/30" dir="rtl">
      <div className="mx-auto max-w-[600px]">
        {hasErrors && createMutation.isError && (
          <div
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            {t("addListing.errors.generic")}
          </div>
        )}

        <TypeSelector value={type} onChange={setType} />

        <CategorySelector
          categoryId={categoryId}
          subcategoryId={subcategoryId}
          error={fieldErrors.category}
          onChange={(catId, subId) => {
            setCategoryId(catId)
            setSubcategoryId(subId ?? null)
            clearFieldError("category")
          }}
        />

        <LocationSelector
          regionId={regionId}
          cityId={cityId}
          error={fieldErrors.location}
          onChange={(rId, cId) => {
            setRegionId(rId)
            setCityId(cId)
            clearFieldError("location")
          }}
        />

        <ListingDetailsForm
          title={title}
          description={description}
          imageUrls={imageUrls}
          price={price}
          includeTax={includeTax}
          type={type}
          errors={{
            title: fieldErrors.title,
            description: fieldErrors.description,
            imageUrls: fieldErrors.imageUrls,
          }}
          onChange={(updates) => {
            if ("title" in updates) {
              setTitle(updates.title ?? "")
              setFieldErrors((e) => ({ ...e, title: undefined }))
            }
            if ("description" in updates) {
              setDescription(updates.description ?? "")
              setFieldErrors((e) => ({ ...e, description: undefined }))
            }
            if ("imageUrls" in updates) {
              setImageUrls(Array.isArray(updates.imageUrls) ? updates.imageUrls : [])
              setFieldErrors((e) => ({ ...e, imageUrls: undefined }))
            }
            if ("price" in updates) setPrice(String(updates.price ?? ""))
            if ("includeTax" in updates) setIncludeTax(!!updates.includeTax)
          }}
        />

        <BiddingOptions
          enabled={bidEnabled}
          visible={bidVisible}
          onChange={(updates) => {
            if ("enabled" in updates) setBidEnabled(updates.enabled ?? false)
            if ("visible" in updates) setBidVisible(updates.visible ?? true)
          }}
        />

        <OptionsCheckboxes
          freeShipping={freeShipping}
          freeReturn={freeReturn}
          allowViewLocation={allowViewLocation}
          contactMessages={contactMessages}
          contactPhone={contactPhone}
          termsAccepted={termsAccepted}
          onChange={(updates) => {
            if ("freeShipping" in updates) setFreeShipping(updates.freeShipping ?? false)
            if ("freeReturn" in updates) setFreeReturn(updates.freeReturn ?? false)
            if ("allowViewLocation" in updates) setAllowViewLocation(updates.allowViewLocation ?? false)
            if ("contactMessages" in updates) setContactMessages(updates.contactMessages ?? false)
            if ("contactPhone" in updates) setContactPhone(updates.contactPhone ?? false)
            if ("termsAccepted" in updates) setTermsAccepted(updates.termsAccepted ?? false)
          }}
        />

        <div className="my-4">
          <SubmitSection
            termsAccepted={termsAccepted}
            onSubmit={handleSubmit}
            isPending={createMutation.isPending}
          />
        </div>
      </div>
    </div>
  )
}
