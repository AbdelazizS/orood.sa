import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { parseAddListingErrors } from "@/lib/addListingErrors"
import { saveAddOfferDraft, loadAddOfferDraft, clearAddOfferDraft } from "@/lib/addOfferDraft"
import { useMainCategories, useSubcategories } from "@/hooks/useCategories"
import { useAppDirection } from "@/providers/DirectionProvider"
import { TypeSelector } from "@/components/add-listing/TypeSelector"
import { CategorySelector } from "@/components/add-listing/CategorySelector"
import { LocationSelector } from "@/components/add-listing/LocationSelector"
import { ListingDetailsForm } from "@/components/add-listing/ListingDetailsForm"
import { OptionsCheckboxes } from "@/components/add-listing/OptionsCheckboxes"
import { BiddingOptions } from "@/components/add-listing/BiddingOptions"
import { SubmitSection } from "@/components/add-listing/SubmitSection"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Add Offer/Request page — اضف عرض او طلب
 * Exact design match: white boxes on #f5f5f5, RTL, teal accents.
 */
export function AddOfferPage() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { id: editListingId } = useParams()
  const isEditMode = Boolean(editListingId && String(location.pathname || "").includes("/edit"))
  const { token, user } = useAuthStore()

  const [type, setType] = useState("offer")
  const [categoryId, setCategoryId] = useState(null)
  const [subcategoryId, setSubcategoryId] = useState(null)
  const [regionId, setRegionId] = useState(null)
  const [cityId, setCityId] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrls, setImageUrls] = useState([])
  const [priceEnabled, setPriceEnabled] = useState(false)
  const [price, setPrice] = useState("")
  const [includeTax, setIncludeTax] = useState(false)
  const [freeShipping, setFreeShipping] = useState(false)
  const [freeReturn, setFreeReturn] = useState(false)
  const [allowViewLocation, setAllowViewLocation] = useState(false)
  const [bidEnabled, setBidEnabled] = useState(false)
  const [bidVisible, setBidVisible] = useState(true)
  const [contactMessages, setContactMessages] = useState(true)
  const [contactPhone, setContactPhone] = useState(false)
  const [contactPhoneNumber, setContactPhoneNumber] = useState("")
  const [legalExpanded, setLegalExpanded] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const formRef = useRef(null)
  const draftRestoredRef = useRef(false)
  const editHydrateOnceRef = useRef(false)
  const [editHydrated, setEditHydrated] = useState(() => !isEditMode)

  const { data: existingListing, isLoading: loadingEditListing, isError: editLoadError } = useQuery({
    queryKey: ["listing", editListingId, "for-edit"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/listings/${editListingId}`)
      return data?.data
    },
    enabled: isEditMode && Boolean(editListingId) && Boolean(token),
  })

  useEffect(() => {
    if (!isEditMode || token) return
    navigate("/login", { state: { redirectTo: location.pathname } })
  }, [isEditMode, token, navigate, location.pathname])

  useEffect(() => {
    editHydrateOnceRef.current = false
  }, [editListingId])

  useEffect(() => {
    if (!isEditMode || !existingListing || editHydrateOnceRef.current) return
    if (user?.id && existingListing.seller?.id && existingListing.seller.id !== user.id) {
      navigate("/dashboard", { replace: true })
      return
    }
    editHydrateOnceRef.current = true
    const p = existingListing
    setType(p.type === "request" ? "request" : "offer")
    setTitle(p.title ?? "")
    setDescription(p.description ?? "")
    const cover = p.media?.image_url
    const gallery = Array.isArray(p.media?.gallery) ? p.media.gallery : []
    const urls = [...new Set([...(cover ? [cover] : []), ...gallery].filter(Boolean))]
    setImageUrls(urls)
    if (p.price != null && Number(p.price) > 0) {
      setPriceEnabled(true)
      setPrice(String(p.price))
    } else {
      setPriceEnabled(false)
      setPrice("")
    }
    setCategoryId(p.category?.id ?? null)
    setSubcategoryId(p.subcategory?.id ?? null)
    setRegionId(p.region?.id ?? null)
    setCityId(p.city?.id ?? null)
    setBidEnabled(!!p.accept_bids)
    setBidVisible(p.bids_visible !== false)
    const ship = p.shipping_details ?? {}
    setFreeShipping(!!ship.free_shipping)
    setFreeReturn(!!ship.free_return)
    setAllowViewLocation(!!(p.view_at_location ?? ship.view_at_client))
    const cp = p.contact_preferences ?? {}
    setContactMessages(cp.messages !== false)
    setContactPhone(!!cp.phone)
    setContactPhoneNumber(cp.phone_number ?? "")
    setLegalExpanded(true)
    setTermsAccepted(true)
    setEditHydrated(true)
  }, [isEditMode, existingListing, user?.id, navigate])

  const { data: mainCategories = [] } = useMainCategories()
  const mainForValidation = mainCategories.find((c) => String(c.id) === String(categoryId))
  const inlineSubsForValidation =
    mainForValidation && Array.isArray(mainForValidation.subcategories)
      ? mainForValidation.subcategories
      : null
  const remoteCategoryIdForValidation = inlineSubsForValidation !== null ? null : categoryId
  const { data: remoteSubsForValidation = [], isPending: remoteSubsPending } = useSubcategories(
    remoteCategoryIdForValidation
  )
  const subsForValidation =
    inlineSubsForValidation !== null ? inlineSubsForValidation : remoteSubsForValidation

  /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydrate from React Router location.state */
  useEffect(() => {
    const dup = location.state?.duplicateFrom
    if (!dup) return
    if (dup.title) setTitle(dup.title)
    if (dup.description) setDescription(dup.description)
    const p = dup.price
    if (p != null && p !== "") {
      setPriceEnabled(true)
      setPrice(String(p))
    } else {
      setPriceEnabled(false)
      setPrice("")
    }
    if (dup.type) setType(dup.type === "request" ? "request" : "offer")
    if (dup.accept_bids != null) setBidEnabled(!!dup.accept_bids)
    if (dup.bids_visible != null) setBidVisible(!!dup.bids_visible)
    if (dup.category_id) setCategoryId(dup.category_id)
    if (dup.subcategory_id) setSubcategoryId(dup.subcategory_id)
    if (dup.region_id) setRegionId(dup.region_id)
    if (dup.city_id) setCityId(dup.city_id)
    const dupImages = Array.isArray(dup.image_urls)
      ? dup.image_urls.filter(Boolean)
      : Array.isArray(dup.imageUrls)
        ? dup.imageUrls.filter(Boolean)
        : []
    if (dupImages.length > 0) setImageUrls(dupImages)
    const cp = dup.contact_preferences ?? {}
    if (cp.messages != null) setContactMessages(cp.messages)
    if (cp.phone != null) setContactPhone(cp.phone)
    if (cp.phone_number != null) setContactPhoneNumber(cp.phone_number)
    const sd = dup.shipping_details ?? {}
    if (sd.free_shipping != null) setFreeShipping(!!sd.free_shipping)
    if (sd.free_return != null) setFreeReturn(!!sd.free_return)
    if (sd.view_at_client != null) setAllowViewLocation(sd.view_at_client)
  }, [location.state?.duplicateFrom])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- restore draft after login redirect */
  useEffect(() => {
    if (!token || draftRestoredRef.current || isEditMode) return
    const d = loadAddOfferDraft()
    if (!d || typeof d !== "object") return
    draftRestoredRef.current = true
    clearAddOfferDraft()
    if (d.type) setType(d.type)
    if (d.categoryId != null) setCategoryId(d.categoryId)
    if (d.subcategoryId != null) setSubcategoryId(d.subcategoryId)
    if (d.regionId != null) setRegionId(d.regionId)
    if (d.cityId != null) setCityId(d.cityId)
    if (d.title != null) setTitle(d.title)
    if (d.description != null) setDescription(d.description)
    if (Array.isArray(d.imageUrls)) setImageUrls(d.imageUrls)
    if (typeof d.priceEnabled === "boolean") setPriceEnabled(d.priceEnabled)
    if (d.price != null) setPrice(String(d.price))
    if (typeof d.includeTax === "boolean") setIncludeTax(d.includeTax)
    if (typeof d.freeShipping === "boolean") setFreeShipping(d.freeShipping)
    if (typeof d.freeReturn === "boolean") setFreeReturn(d.freeReturn)
    if (typeof d.allowViewLocation === "boolean") setAllowViewLocation(d.allowViewLocation)
    if (typeof d.bidEnabled === "boolean") setBidEnabled(d.bidEnabled)
    if (typeof d.bidVisible === "boolean") setBidVisible(d.bidVisible)
    if (typeof d.contactMessages === "boolean") setContactMessages(d.contactMessages)
    if (typeof d.contactPhone === "boolean") setContactPhone(d.contactPhone)
    if (typeof d.contactPhoneNumber === "string") setContactPhoneNumber(d.contactPhoneNumber)
    if (typeof d.legalExpanded === "boolean") setLegalExpanded(d.legalExpanded)
    if (typeof d.termsAccepted === "boolean") setTermsAccepted(d.termsAccepted)
  }, [token, isEditMode])
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEditMode
        ? apiClient.put(`/products/${editListingId}`, payload)
        : apiClient.post("/products", payload),
    onSuccess: () => {
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ["listing", editListingId] })
        queryClient.invalidateQueries({ queryKey: ["product", editListingId] })
        queryClient.invalidateQueries({ queryKey: ["products", "mine"] })
        navigate(`/products/${editListingId}`, { replace: true })
      } else {
        clearAddOfferDraft()
        navigate("/", { replace: true })
      }
    },
    onError: (err) => {
      setFieldErrors(parseAddListingErrors(err, t))
    },
  })

  const isValidUrl = (url) =>
    typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))

  const validate = () => {
    const err = {}
    if (!categoryId) err.category = t("addListing.errors.categoryRequired")
    else if (inlineSubsForValidation === null && categoryId && remoteSubsPending) {
      err.category = t("addListing.errors.subcategoriesLoading")
    } else if (subsForValidation.length > 0 && !subcategoryId) {
      err.category = t("addListing.errors.subcategoryRequired")
    }
    if (!regionId || !cityId) err.location = t("addListing.errors.locationRequired")
    if (!title?.trim()) err.title = t("addListing.errors.titleRequired")
    if (!description?.trim()) err.description = t("addListing.errors.descriptionRequired")
    const validUrls = (imageUrls || []).filter(isValidUrl)
    if (type === "offer" && validUrls.length === 0) {
      err.imageUrls = t("addListing.errors.imagesRequired")
    }
    if (priceEnabled) {
      const n = parseFloat(String(price).replace(",", "."))
      if (!Number.isFinite(n) || n <= 0) err.price = t("addListing.errors.priceInvalid")
    }
    if (!contactMessages && !contactPhone) err.contactMethods = t("addListing.contactMethodRequired")
    if (contactPhone) {
      const normalized = String(contactPhoneNumber ?? "").trim()
      if (!normalized) {
        err.contactPhoneNumber = t("addListing.phoneNumberRequiredForCall")
      } else if (!/^05\d{8}$/.test(normalized)) {
        err.contactPhoneNumber = t("addListing.phoneNumberInvalid")
      }
    }
    if (!legalExpanded && !isEditMode) err.oathExpanded = t("addListing.oathSectionRequired", "يرجى الاطلاع على قسم التعهدات قبل النشر")
    if (!termsAccepted && !isEditMode) err.termsAccepted = t("addListing.oathRequired")
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

    if (!token) {
      saveAddOfferDraft({
        type,
        categoryId,
        subcategoryId,
        regionId,
        cityId,
        title,
        description,
        imageUrls,
        priceEnabled,
        price,
        includeTax,
        freeShipping,
        freeReturn,
        allowViewLocation,
        bidEnabled,
        bidVisible,
        contactMessages,
        contactPhone,
        contactPhoneNumber,
        legalExpanded,
        termsAccepted,
      })
      navigate("/login", { state: { redirectTo: "/add" } })
      return
    }

    const validUrls = (imageUrls || []).filter(isValidUrl)
    const priceNum =
      priceEnabled && price !== "" ? parseFloat(String(price).replace(",", ".")) : null
    const payload = {
      type,
      title: title.trim(),
      description: description.trim(),
      price: priceEnabled && priceNum != null && Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null,
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
      contact_phone_number: contactPhone ? String(contactPhoneNumber || "").trim() : null,
      contact_messages: contactMessages,
      free_shipping: freeShipping,
      free_return: freeReturn,
    }
    saveMutation.mutate(payload)
  }

  const hasErrors = Object.keys(fieldErrors).length > 0

  if (isEditMode && token && (loadingEditListing || !editHydrated)) {
    return (
      <div className="px-4 py-12 sm:px-6 bg-muted/30" dir={direction}>
        <div className="mx-auto max-w-[600px] space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isEditMode && token && editLoadError) {
    return (
      <div className="px-4 py-12 sm:px-6 bg-muted/30" dir={direction}>
        <p className="text-destructive text-center">{t("common.error")}</p>
      </div>
    )
  }

  return (
    <div ref={formRef} className="px-4 py-6 sm:px-6 sm:py-8 bg-muted/30" dir={direction}>
      <div className="mx-auto max-w-[600px]">
        {isEditMode && (
          <h1 className="mb-4 text-xl font-bold text-foreground">
            {t("addOffer.editTitle", "Edit listing")}
          </h1>
        )}
        {!token && (
          <Alert className="mb-4 border-primary/30 bg-primary/5">
            <AlertDescription className="text-sm text-foreground">
              {t("addListing.guestBanner")}
            </AlertDescription>
          </Alert>
        )}
        {hasErrors && saveMutation.isError && (
          <div
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            {t("addListing.errors.generic")}
          </div>
        )}

        <TypeSelector value={type} onChange={setType} disabled={isEditMode} />

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
          priceEnabled={priceEnabled}
          price={price}
          includeTax={includeTax}
          type={type}
          errors={{
            title: fieldErrors.title,
            description: fieldErrors.description,
            imageUrls: fieldErrors.imageUrls,
            price: fieldErrors.price,
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
            if ("priceEnabled" in updates) {
              const on = !!updates.priceEnabled
              setPriceEnabled(on)
              if (!on) {
                setPrice("")
                setIncludeTax(false)
              }
              clearFieldError("price")
            }
            if ("price" in updates) {
              setPrice(String(updates.price ?? ""))
              clearFieldError("price")
            }
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
          contactPhoneNumber={contactPhoneNumber}
          termsAccepted={termsAccepted}
          legalExpanded={legalExpanded}
          fieldErrors={{
            contactPhoneNumber: fieldErrors.contactPhoneNumber,
            termsAccepted: fieldErrors.termsAccepted,
          }}
          onChange={(updates) => {
            if ("freeShipping" in updates) setFreeShipping(updates.freeShipping ?? false)
            if ("freeReturn" in updates) setFreeReturn(updates.freeReturn ?? false)
            if ("allowViewLocation" in updates) setAllowViewLocation(updates.allowViewLocation ?? false)
            if ("contactMessages" in updates) setContactMessages(updates.contactMessages ?? false)
            if ("contactPhone" in updates) setContactPhone(updates.contactPhone ?? false)
            if ("contactPhoneNumber" in updates) setContactPhoneNumber(updates.contactPhoneNumber ?? "")
            if ("legalExpanded" in updates) setLegalExpanded(updates.legalExpanded ?? false)
            if ("termsAccepted" in updates) setTermsAccepted(updates.termsAccepted ?? false)
            if ("contactPhone" in updates || "contactMessages" in updates) clearFieldError("contactMethods")
            if ("contactPhoneNumber" in updates) clearFieldError("contactPhoneNumber")
            if ("termsAccepted" in updates) clearFieldError("termsAccepted")
            if ("legalExpanded" in updates) clearFieldError("oathExpanded")
          }}
        />

        {(fieldErrors.contactMethods || fieldErrors.termsAccepted || fieldErrors.oathExpanded) ? (
          <p className="mb-2 text-xs text-destructive">
            {fieldErrors.contactMethods ?? fieldErrors.oathExpanded ?? fieldErrors.termsAccepted}
          </p>
        ) : null}

        <div className="my-4">
          <SubmitSection
            termsAccepted={termsAccepted}
            onSubmit={handleSubmit}
            isPending={saveMutation.isPending}
            requireTerms={!isEditMode}
            submitLabelIdle={isEditMode ? t("addListing.saveChanges", "Save changes") : undefined}
            submitLabelPending={isEditMode ? t("common.loading") : undefined}
          />
        </div>
      </div>
    </div>
  )
}
