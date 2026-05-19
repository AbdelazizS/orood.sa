import { useState, useEffect, useRef, useMemo } from "react"
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
import { useListingSchema } from "@/hooks/useListingSchema"
import {
  DynamicSchemaRenderer,
  DynamicLocationField,
  DynamicAgreementRenderer,
} from "@/components/dynamic-listing"
import { evaluateVisibleWhen } from "@/lib/listings/schemaUtils"
import { buildListingAttributesPayload } from "@/lib/listings/buildListingAttributesPayload"
import { hydrateListingFormState, listingAttributesFromProduct } from "@/lib/listings/hydrateListingFormFromApi"
import { isRealEstateCategorySelection } from "@/lib/listings/isRealEstateListing"
import { contactPhoneFieldError, normalizeSaudiPhone } from "@/lib/phone/saudiPhone"
import { ListingDetailsForm } from "@/components/add-listing/ListingDetailsForm"
import { OptionsCheckboxes } from "@/components/add-listing/OptionsCheckboxes"
import { SubmitSection } from "@/components/add-listing/SubmitSection"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { SeoHead } from "@/components/seo/SeoHead"
import { useResolvedSeo } from "@/hooks/useResolvedSeo"

/**
 * Add Offer/Request page — اضف عرض او طلب
 * Exact design match: white boxes on #f5f5f5, RTL, teal accents.
 */
export function AddOfferPage() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const seoQuery = useResolvedSeo("/add")
  const seo = seoQuery.data
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
  const [freeShipping, setFreeShipping] = useState(false)
  const [freeReturn, setFreeReturn] = useState(false)
  const [returnDays, setReturnDays] = useState("1")
  const [showComments, setShowComments] = useState(true)
  const [allowViewLocation, setAllowViewLocation] = useState(false)
  const [bidEnabled, setBidEnabled] = useState(false)
  const [bidVisible, setBidVisible] = useState(true)
  const [contactMessages, setContactMessages] = useState(true)
  const [contactPhone, setContactPhone] = useState(false)
  const [contactPhoneNumber, setContactPhoneNumber] = useState("")
  const [propertyLat, setPropertyLat] = useState(null)
  const [propertyLng, setPropertyLng] = useState(null)
  const [propertyAddress, setPropertyAddress] = useState("")
  const [listingAttributes, setListingAttributes] = useState({})
  const [acceptedAgreementIds, setAcceptedAgreementIds] = useState([])
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
    const hydrated = hydrateListingFormState(existingListing)
    if (!hydrated) return
    setType(hydrated.type)
    setTitle(hydrated.title)
    setDescription(hydrated.description)
    setImageUrls(hydrated.imageUrls)
    setPriceEnabled(hydrated.priceEnabled)
    setPrice(hydrated.price)
    setCategoryId(hydrated.categoryId)
    setSubcategoryId(hydrated.subcategoryId)
    setRegionId(hydrated.regionId)
    setCityId(hydrated.cityId)
    setBidEnabled(hydrated.bidEnabled)
    setBidVisible(hydrated.bidVisible)
    setFreeShipping(hydrated.freeShipping)
    setFreeReturn(hydrated.freeReturn)
    setReturnDays(hydrated.returnDays)
    setShowComments(hydrated.showComments)
    setAllowViewLocation(hydrated.allowViewLocation)
    setContactMessages(hydrated.contactMessages)
    setContactPhone(hydrated.contactPhone)
    setContactPhoneNumber(hydrated.contactPhoneNumber)
    setPropertyLat(hydrated.propertyLat)
    setPropertyLng(hydrated.propertyLng)
    setPropertyAddress(hydrated.propertyAddress)
    setListingAttributes(hydrated.listingAttributes)
    setTermsAccepted(true)
    setEditHydrated(true)
  }, [isEditMode, existingListing, user?.id, navigate])

  const { data: mainCategories = [] } = useMainCategories()
  const {
    data: schemaResult,
    isLoading: schemaLoading,
    isFetching: schemaFetching,
  } = useListingSchema(categoryId, subcategoryId, type)
  const selectedCategory = useMemo(
    () => mainCategories.find((c) => String(c.id) === String(categoryId)),
    [mainCategories, categoryId],
  )
  const categorySchemaEnabled = Boolean(selectedCategory?.dynamic_schema_enabled ?? schemaResult?.enabled)
  const activeSchema = categorySchemaEnabled && schemaResult?.schema ? schemaResult.schema : null
  const usesDynamicSchema = Boolean(activeSchema)
  const schemaMissing =
    categorySchemaEnabled &&
    Boolean(categoryId) &&
    !schemaLoading &&
    !schemaFetching &&
    !activeSchema
  const locationPolicy = activeSchema?.policies?.location
  const isRealEstateCategory = isRealEstateCategorySelection(categoryId, mainCategories)
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

  useEffect(() => {
    if (isRealEstateCategory) return
    setPropertyLat(null)
    setPropertyLng(null)
    setPropertyAddress("")
  }, [isRealEstateCategory, categoryId])

  /* Re-apply full attribute map when published schema is ready (visible_when + switches). */
  useEffect(() => {
    if (!isEditMode || !existingListing || !editHydrated) return
    if (categorySchemaEnabled && (schemaLoading || schemaFetching) && !activeSchema) return

    const merged = listingAttributesFromProduct(existingListing)
    if (Object.keys(merged).length === 0) return

    setListingAttributes((prev) => {
      const next = { ...prev, ...merged }
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next
    })
  }, [
    isEditMode,
    existingListing,
    editHydrated,
    categorySchemaEnabled,
    schemaLoading,
    schemaFetching,
    activeSchema,
  ])

  /* Edit: pre-accept required schema agreements (already published listing). */
  useEffect(() => {
    if (!isEditMode || !activeSchema?.agreements?.length) return
    const ids = activeSchema.agreements.filter((a) => a.required).map((a) => a.id)
    if (!ids.length) return
    setAcceptedAgreementIds((prev) => {
      const merged = new Set([...prev, ...ids])
      return Array.from(merged)
    })
  }, [isEditMode, activeSchema])

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
    if (dup.location_lat != null) setPropertyLat(dup.location_lat)
    if (dup.location_lng != null) setPropertyLng(dup.location_lng)
    if (dup.location_address) setPropertyAddress(dup.location_address)
    if (dup.listing_attributes && typeof dup.listing_attributes === "object") {
      setListingAttributes(dup.listing_attributes)
    }
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
    if (typeof d.freeShipping === "boolean") setFreeShipping(d.freeShipping)
    if (typeof d.freeReturn === "boolean") setFreeReturn(d.freeReturn)
    if (d.returnDays != null) setReturnDays(String(d.returnDays))
    if (typeof d.showComments === "boolean") setShowComments(d.showComments)
    if (typeof d.allowViewLocation === "boolean") setAllowViewLocation(d.allowViewLocation)
    if (typeof d.bidEnabled === "boolean") setBidEnabled(d.bidEnabled)
    if (typeof d.bidVisible === "boolean") setBidVisible(d.bidVisible)
    if (typeof d.contactMessages === "boolean") setContactMessages(d.contactMessages)
    if (typeof d.contactPhone === "boolean") setContactPhone(d.contactPhone)
    if (typeof d.contactPhoneNumber === "string") setContactPhoneNumber(d.contactPhoneNumber)
    if (d.propertyLat != null) setPropertyLat(d.propertyLat)
    if (d.propertyLng != null) setPropertyLng(d.propertyLng)
    if (typeof d.propertyAddress === "string") setPropertyAddress(d.propertyAddress)
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
    if (!usesDynamicSchema && (!regionId || !cityId)) err.location = t("addListing.errors.locationRequired")
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
      const phoneErr = contactPhoneFieldError(contactPhoneNumber, t, { required: true })
      if (phoneErr) err.contactPhoneNumber = phoneErr
    }
    if (usesDynamicSchema && activeSchema) {
      for (const field of activeSchema.fields ?? []) {
        if (["divider", "info", "warning", "instruction_block"].includes(field.field_type)) continue
        if (!evaluateVisibleWhen(field.visible_when, listingAttributes)) continue
        if (field.required) {
          const val = listingAttributes[field.field_key]
          if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
            err[field.field_key] = t("addListing.errors.fieldRequired", "{{label}} مطلوب", { label: field.label })
          }
        }
      }
      const locMode = locationPolicy?.mode ?? "region_only"
      if (locMode !== "hidden" && (locationPolicy?.required || locMode === "exact_map")) {
        if ((locMode === "region_only" || locMode === "city_only" || locMode === "exact_map") && (!regionId || !cityId)) {
          err.location = t("addListing.errors.locationRequired")
        }
        if (locMode === "exact_map" && isRealEstateCategory) {
          const la = propertyLat != null ? Number(propertyLat) : null
          const ln = propertyLng != null ? Number(propertyLng) : null
          if (la == null || ln == null || !Number.isFinite(la) || !Number.isFinite(ln)) {
            err.propertyLocation = t("addListing.errors.propertyLocationRequired", "حدد موقع العقار على الخريطة")
          }
        }
      }
      if (!isEditMode) {
        const requiredAgreements = (activeSchema.agreements ?? []).filter((a) => a.required)
        for (const ag of requiredAgreements) {
          if (!acceptedAgreementIds.includes(ag.id)) {
            err.agreements = t("addListing.oathRequired")
            break
          }
        }
      }
    } else if (!termsAccepted && !isEditMode) {
      err.termsAccepted = t("addListing.oathRequired")
    }
    if (schemaMissing) {
      err.schema = t("addListing.errors.schemaMissing", "لا يوجد مخطط منشور لهذا القسم. تواصل مع الإدارة.")
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
        freeShipping,
        freeReturn,
        returnDays,
        showComments,
        allowViewLocation,
        bidEnabled,
        bidVisible,
        contactMessages,
        contactPhone,
        contactPhoneNumber,
        propertyLat,
        propertyLng,
        propertyAddress,
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
      show_comments: showComments,
      return_days: freeReturn && returnDays !== "" ? String(returnDays).trim() : null,
      view_at_client: allowViewLocation,
      contact_phone: contactPhone,
      contact_phone_number: contactPhone ? normalizeSaudiPhone(contactPhoneNumber) || null : null,
      contact_messages: contactMessages,
      free_shipping: freeShipping,
      free_return: freeReturn,
      ...(usesDynamicSchema
        ? {
            listing_attributes: buildListingAttributesPayload(activeSchema, listingAttributes),
            ...(isRealEstateCategory && locationPolicy?.mode === "exact_map"
              ? {
                  location_lat: propertyLat != null ? Number(propertyLat) : null,
                  location_lng: propertyLng != null ? Number(propertyLng) : null,
                  location_address: propertyAddress.trim() || null,
                }
              : {}),
          }
        : {}),
    }
    saveMutation.mutate(payload)
  }

  const hasErrors = Object.keys(fieldErrors).length > 0

  const editSchemaPending =
    isEditMode &&
    editHydrated &&
    categorySchemaEnabled &&
    !schemaMissing &&
    (schemaLoading || schemaFetching) &&
    !activeSchema

  if (isEditMode && token && (loadingEditListing || !editHydrated || editSchemaPending)) {
    return (
      <div className="px-4 py-12 sm:px-6 bg-muted/30" dir={direction}>
        <div className="mx-auto w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl space-y-4">
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
    <div ref={formRef} className="min-h-0 bg-muted/30 px-4 py-6 sm:px-6 sm:py-8 lg:px-8" dir={direction}>
      <SeoHead
        path="/add"
        title={seo?.seo_title}
        description={seo?.description}
        hreflang={seo?.hreflang}
        robots={seo?.robots}
        useTitleAsFull={Boolean(seo?.seo_title)}
      />
      <div className="mx-auto w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl">
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
        {hasErrors && (
          <div
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive space-y-1"
            role="alert"
          >
            <p>{t("addListing.errors.generic")}</p>
            {Object.entries(fieldErrors)
              .filter(([k]) => !["categoryId", "subcategoryId", "regionId", "cityId"].includes(k))
              .slice(0, 6)
              .map(([k, msg]) => (
                <p key={k} className="text-xs">
                  {msg}
                </p>
              ))}
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
            setListingAttributes({})
            setAcceptedAgreementIds([])
            clearFieldError("category")
          }}
        />

        {schemaMissing ? (
          <Alert className="mb-4 border-amber-500/40 bg-amber-500/10">
            <AlertDescription className="text-sm">
              {t("addListing.errors.schemaMissing", "لا يوجد مخطط إعلان منشور لهذا القسم. يمكن للإدارة إنشاؤه من إدارة الأقسام → مخطط الإعلان.")}
            </AlertDescription>
          </Alert>
        ) : null}

        {usesDynamicSchema ? (
          <>
            <DynamicSchemaRenderer
              schema={activeSchema}
              attributes={listingAttributes}
              onChange={setListingAttributes}
              errors={fieldErrors}
              isLoading={schemaLoading || schemaFetching}
            />
            <DynamicLocationField
              locationPolicy={locationPolicy}
              mapEnabled={isRealEstateCategory}
              regionId={regionId}
              cityId={cityId}
              onRegionCityChange={(rId, cId) => {
                setRegionId(rId)
                setCityId(cId)
                clearFieldError("location")
              }}
              lat={propertyLat}
              lng={propertyLng}
              address={propertyAddress}
              onMapChange={({ lat, lng, address }) => {
                setPropertyLat(lat)
                setPropertyLng(lng)
                if (address !== undefined) setPropertyAddress(address ?? "")
                clearFieldError("propertyLocation")
              }}
              regionCityError={fieldErrors.location}
              mapError={fieldErrors.propertyLocation}
            />
          </>
        ) : (
          <>
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
          </>
        )}

        <ListingDetailsForm
          title={title}
          description={description}
          imageUrls={imageUrls}
          priceEnabled={priceEnabled}
          price={price}
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
              }
              clearFieldError("price")
            }
            if ("price" in updates) {
              setPrice(String(updates.price ?? ""))
              clearFieldError("price")
            }
          }}
        />

        <OptionsCheckboxes
          freeShipping={freeShipping}
          freeReturn={freeReturn}
          returnDays={returnDays}
          allowViewLocation={allowViewLocation}
          showComments={showComments}
          bidEnabled={bidEnabled}
          bidVisible={bidVisible}
          contactMessages={contactMessages}
          contactPhone={contactPhone}
          contactPhoneNumber={contactPhoneNumber}
          defaultPhone={user?.phone ?? ""}
          termsAccepted={termsAccepted}
          hideLegal={usesDynamicSchema}
          fieldErrors={{
            contactPhoneNumber: fieldErrors.contactPhoneNumber,
            termsAccepted: fieldErrors.termsAccepted,
          }}
          onChange={(updates) => {
            if ("freeShipping" in updates) setFreeShipping(updates.freeShipping ?? false)
            if ("freeReturn" in updates) setFreeReturn(updates.freeReturn ?? false)
            if ("returnDays" in updates) setReturnDays(updates.returnDays ?? "")
            if ("showComments" in updates) setShowComments(updates.showComments ?? true)
            if ("bidEnabled" in updates) setBidEnabled(updates.bidEnabled ?? false)
            if ("bidVisible" in updates) setBidVisible(updates.bidVisible ?? true)
            if ("allowViewLocation" in updates) setAllowViewLocation(updates.allowViewLocation ?? false)
            if ("contactMessages" in updates) setContactMessages(updates.contactMessages ?? false)
            if ("contactPhone" in updates) setContactPhone(updates.contactPhone ?? false)
            if ("contactPhoneNumber" in updates) setContactPhoneNumber(updates.contactPhoneNumber ?? "")
            if ("termsAccepted" in updates) setTermsAccepted(updates.termsAccepted ?? false)
            if ("contactPhone" in updates || "contactMessages" in updates) clearFieldError("contactMethods")
            if ("contactPhoneNumber" in updates) clearFieldError("contactPhoneNumber")
            if ("termsAccepted" in updates) clearFieldError("termsAccepted")
          }}
        />

        {usesDynamicSchema ? (
          <DynamicAgreementRenderer
            agreements={activeSchema?.agreements ?? []}
            acceptedIds={acceptedAgreementIds}
            onChange={setAcceptedAgreementIds}
            error={fieldErrors.agreements}
          />
        ) : null}

        {(fieldErrors.contactMethods || fieldErrors.termsAccepted || fieldErrors.propertyLocation) ? (
          <p className="mb-2 text-xs text-destructive">
            {fieldErrors.contactMethods ?? fieldErrors.propertyLocation ?? fieldErrors.termsAccepted}
          </p>
        ) : null}

        <div className="my-4">
          <SubmitSection
            termsAccepted={termsAccepted}
            onSubmit={handleSubmit}
            isPending={saveMutation.isPending}
            requireTerms={!isEditMode}
            termsAccepted={
              usesDynamicSchema
                ? (activeSchema?.agreements ?? [])
                    .filter((a) => a.required)
                    .every((a) => acceptedAgreementIds.includes(a.id))
                : termsAccepted
            }
            submitLabelIdle={isEditMode ? t("addListing.saveChanges", "Save changes") : undefined}
            submitLabelPending={isEditMode ? t("common.loading") : undefined}
          />
        </div>
      </div>
    </div>
  )
}
