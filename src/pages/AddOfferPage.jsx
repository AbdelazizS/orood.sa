import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { getFormConfig } from "@/lib/addProductFormConfig"
import { AddProductStepper } from "@/components/forms/AddProduct/AddProductStepper"
import { StepTypeSelect } from "@/components/forms/AddProduct/StepTypeSelect"
import { CategorySelector } from "@/components/forms/AddProduct/CategorySelector"
import { LocationSelector } from "@/components/forms/AddProduct/LocationSelector"
import { StepDetails } from "@/components/forms/AddProduct/StepDetails"
import { StepOptions } from "@/components/forms/AddProduct/StepOptions"
import { StepContact } from "@/components/forms/AddProduct/StepContact"
import { StepSubmit } from "@/components/forms/AddProduct/StepSubmit"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = ["type", "category", "location", "details", "options", "contact", "submit"]

export function AddOfferPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [type, setType] = useState("offer")
  const formConfig = getFormConfig(type)
  const [categoryId, setCategoryId] = useState(null)
  const [subcategoryId, setSubcategoryId] = useState(null)
  const [regionId, setRegionId] = useState(null)
  const [cityId, setCityId] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrls, setImageUrls] = useState([])
  const [addPrice, setAddPrice] = useState(false)
  const [price, setPrice] = useState("")
  const [freeShipping, setFreeShipping] = useState(false)
  const [freeReturn, setFreeReturn] = useState(false)
  const [returnDays, setReturnDays] = useState("same_day")
  const [allowViewLocation, setAllowViewLocation] = useState(false)
  const [bidEnabled, setBidEnabled] = useState(false)
  const [bidVisibility, setBidVisibility] = useState("public")
  const [contactChat, setContactChat] = useState(true)
  const [contactPhone, setContactPhone] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [agreed, setAgreed] = useState(false)

  // Pre-fill from Duplicate action
  useEffect(() => {
    const dup = location.state?.duplicateFrom
    if (!dup) return
    if (dup.title) setTitle(dup.title)
    if (dup.description) setDescription(dup.description)
    if (dup.price != null) {
      setAddPrice(true)
      setPrice(String(dup.price))
    }
    if (dup.type) setType(dup.type === "request" ? "request" : "offer")
    if (dup.category_id) setCategoryId(dup.category_id)
    if (dup.subcategory_id) setSubcategoryId(dup.subcategory_id)
    if (dup.region_id) setRegionId(dup.region_id)
    if (dup.city_id) setCityId(dup.city_id)
    if (dup.accept_bids != null) setBidEnabled(dup.accept_bids)
    const cp = dup.contact_preferences ?? {}
    if (cp.messages != null) setContactChat(cp.messages)
    if (cp.phone != null) setContactPhone(cp.phone)
    if (cp.phone_number) setPhoneNumber(cp.phone_number)
    const sd = dup.shipping_details ?? {}
    if (sd.view_at_client != null) setAllowViewLocation(sd.view_at_client)
  }, [location.state?.duplicateFrom])

  const stepId = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/products", payload),
    onSuccess: () => navigate("/", { replace: true }),
  })

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit()
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }

  const canProceed = () => {
    if (stepId === "type") return Boolean(type)
    if (stepId === "category") return Boolean(categoryId)
    if (stepId === "location") return true
    if (stepId === "details") {
      const valid = Boolean(title) && Boolean(description)
      if (formConfig.requireImages) return valid && imageUrls.length >= formConfig.minImages
      return valid
    }
    if (stepId === "options") return true
    if (stepId === "contact") return true
    if (stepId === "submit") return agreed
    return true
  }

  const handleSubmit = () => {
    const urls = imageUrls.filter(Boolean)
    const payload = {
      type,
      title,
      description,
      price: addPrice && price ? parseFloat(price) : null,
      category_id: categoryId ?? null,
      subcategory_id: subcategoryId ?? null,
      region_id: regionId ?? null,
      city_id: cityId ?? null,
      image_url: urls[0] || null,
      image_urls: urls,
      accept_bids: bidEnabled,
      bids_visible: bidVisibility === "public",
      view_at_client: allowViewLocation,
      contact_phone: contactPhone,
      contact_messages: contactChat,
      contact_phone_number: contactPhone ? phoneNumber || null : null,
    }
    if (formConfig.allowShipping) {
      payload.free_shipping = freeShipping
      payload.free_return = freeReturn
      payload.return_days = freeReturn ? returnDays : null
    } else {
      payload.free_shipping = false
      payload.free_return = false
      payload.return_days = null
    }
    createMutation.mutate(payload)
  }

  if (!token) {
    navigate("/login", { replace: true })
    return null
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("addOffer.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("addOffer.description")}</p>
      </div>

      <AddProductStepper
        currentStep={stepId}
        onStepClick={(id) => {
          const idx = STEPS.indexOf(id)
          if (idx !== -1) setCurrentStep(idx)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {stepId === "type" && t("addProduct.stepType")}
            {stepId === "category" && t("addProduct.stepCategory")}
            {stepId === "location" && t("addProduct.stepLocation")}
            {stepId === "details" && t("addProduct.stepDetails")}
            {stepId === "options" && t("addProduct.stepOptions")}
            {stepId === "contact" && t("addProduct.stepContact")}
            {stepId === "submit" && t("addProduct.stepSubmit")}
          </CardTitle>
          <CardDescription>
            {stepId === "type" && t("addOffer.description")}
            {stepId === "category" && t("addProduct.selectCategory")}
            {stepId === "location" && t("addProduct.selectLocation")}
            {stepId === "details" && t("addProduct.stepDetails")}
            {stepId === "options" && t("addProduct.stepOptions")}
            {stepId === "contact" && t("addProduct.stepContact")}
            {stepId === "submit" && t("addProduct.agreeTerms")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stepId === "type" && (
            <StepTypeSelect
              value={type}
              onChange={(newType) => {
                setType(newType)
                const cfg = getFormConfig(newType)
                if (newType === "request") {
                  setFreeShipping(false)
                  setFreeReturn(false)
                  setReturnDays("same_day")
                  setBidEnabled(cfg.bidDefaultEnabled)
                } else {
                  setBidEnabled(cfg.bidDefaultEnabled)
                }
              }}
            />
          )}
          {stepId === "category" && (
            <CategorySelector
              categoryId={categoryId}
              subcategoryId={subcategoryId}
              onChange={(catId, subId) => {
                setCategoryId(catId)
                setSubcategoryId(subId ?? null)
              }}
            />
          )}
          {stepId === "location" && (
            <LocationSelector
              regionId={regionId}
              cityId={cityId}
              onChange={(rId, cId) => {
                setRegionId(rId)
                setCityId(cId)
              }}
            />
          )}
          {stepId === "details" && (
            <StepDetails
              type={type}
              config={formConfig}
              title={title}
              description={description}
              imageUrls={imageUrls}
              price={price}
              addPrice={addPrice}
              onChange={(updates) => {
                if ("title" in updates) setTitle(updates.title ?? "")
                if ("description" in updates) setDescription(updates.description ?? "")
                if ("imageUrls" in updates) setImageUrls(Array.isArray(updates.imageUrls) ? updates.imageUrls : [])
                if ("price" in updates) setPrice(String(updates.price ?? ""))
                if ("addPrice" in updates) setAddPrice(!!updates.addPrice)
              }}
            />
          )}
          {stepId === "options" && (
            <StepOptions
              type={type}
              config={formConfig}
              freeShipping={freeShipping}
              freeReturn={freeReturn}
              returnDays={returnDays}
              allowViewLocation={allowViewLocation}
              bidEnabled={bidEnabled}
              bidVisibility={bidVisibility}
              onChange={(updates) => {
                if ("freeShipping" in updates) setFreeShipping(updates.freeShipping ?? false)
                if ("freeReturn" in updates) setFreeReturn(updates.freeReturn ?? false)
                if ("returnDays" in updates) setReturnDays(updates.returnDays ?? "same_day")
                if ("allowViewLocation" in updates) setAllowViewLocation(updates.allowViewLocation ?? false)
                if ("bidEnabled" in updates) setBidEnabled(updates.bidEnabled ?? false)
                if ("bidVisibility" in updates) setBidVisibility(updates.bidVisibility ?? "public")
              }}
            />
          )}
          {stepId === "contact" && (
            <StepContact
              contactChat={contactChat}
              contactPhone={contactPhone}
              phoneNumber={phoneNumber}
              onChange={(updates) => {
                if ("contactChat" in updates) setContactChat(updates.contactChat ?? false)
                if ("contactPhone" in updates) setContactPhone(updates.contactPhone ?? false)
                if ("phoneNumber" in updates) setPhoneNumber(updates.phoneNumber ?? "")
              }}
            />
          )}
          {stepId === "submit" && (
            <StepSubmit
              agreed={agreed}
              onChange={(updates) => setAgreed(updates.agreed ?? false)}
            />
          )}
          {createMutation.isError && (
            <p className="mt-4 text-sm text-destructive">
              {createMutation.error?.response?.data?.message ?? t("common.error")}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-4 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || createMutation.isPending}
          >
            <ChevronLeft className="size-4 rtl-rotate" />
            {t("common.back")}
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isLastStep ? (
              t("addOffer.submit")
            ) : (
              t("common.next")
            )}
            {!createMutation.isPending && !isLastStep && (
              <ChevronRight className="size-4 rtl-rotate" />
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
