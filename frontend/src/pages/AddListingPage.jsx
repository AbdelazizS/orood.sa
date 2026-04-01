import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { addListingSchema } from "@/lib/validations/listing"
import AddListingTypeSelector from "@/components/add-listing/AddListingTypeSelector"
import CategoryPicker from "@/components/add-listing/CategoryPicker"
import LocationPicker from "@/components/add-listing/LocationPicker"
import TitleField from "@/components/add-listing/TitleField"
import DescriptionField from "@/components/add-listing/DescriptionField"
import ImageUploader from "@/components/add-listing/ImageUploader"
import PriceField from "@/components/add-listing/PriceField"
import { BiddingOptions } from "@/components/add-listing/BiddingOptions"
import OptionsSection from "@/components/add-listing/OptionsSection"
import TermsSubmit from "@/components/add-listing/TermsSubmit"
import { useUploadImages } from "@/hooks/useUploadImages"
import { useCreateListing } from "@/hooks/useCreateListing"
import { useAuthStore } from "@/store/useAuthStore"

export function AddListingPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { upload, progress, isUploading } = useUploadImages()
  const createListing = useCreateListing()
  const [imageFiles, setImageFiles] = useState([])
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate("/login?redirect=/add-listing", { replace: true })
    }
  }, [token, navigate])

  const form = useForm({
    resolver: zodResolver(addListingSchema),
    defaultValues: {
      type: "OFFER",
      mainCategoryId: "",
      subCategoryId: "",
      regionId: "",
      cityId: "",
      title: "",
      description: "",
      price: undefined,
      taxIncluded: false,
      contactPhone: "",
      contactByCall: false,
      contactByMessage: true,
      freeShipping: false,
      freeReturnSameDay: false,
      freeReturnDays: undefined,
      viewAtLocation: false,
      showComments: true,
      biddingEnabled: false,
      biddingVisible: true,
      noPlatformFee: true,
    },
  })

  const onSubmit = async (values) => {
    let imageUrls = []
    if (imageFiles.length > 0) {
      const files = imageFiles.map((img) => img.file)
      imageUrls = await upload(files)
    }

    const payload = {
      type: values.type.toLowerCase(),
      title: values.title,
      description: values.description,
      price: values.price ?? null,
      category_id: values.mainCategoryId,
      subcategory_id: values.subCategoryId,
      region_id: values.regionId,
      city_id: values.cityId,
      image_url: imageUrls[0] || null,
      image_urls: imageUrls,
      accept_bids: values.biddingEnabled,
      bids_visible: values.biddingVisible,
      view_at_client: values.viewAtLocation,
      contact_phone: values.contactPhone || null,
      contact_messages: values.contactByMessage,
      free_shipping: values.freeShipping,
      free_return: values.freeReturnSameDay ?? false,
    }

    createListing.mutate(payload)
  }

  const isSubmitting = isUploading || createListing.isPending

  if (!token) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-6 pb-4">
          <h1 className="text-xl font-bold text-foreground text-right">
            إضافة إعلان جديد
          </h1>
        </div>
        <Separator className="mb-6" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-8">
            <AddListingTypeSelector form={form} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CategoryPicker form={form} />
              <LocationPicker form={form} />
            </div>

            <TitleField form={form} />

            <div className="md:col-span-2">
              <DescriptionField form={form} />
            </div>

            <div className="md:col-span-2">
              <div className="px-4 sm:px-6 lg:px-8 mb-2">
                <span className="text-sm font-medium text-foreground">
                  حمل صور
                  {form.watch("type") === "OFFER" && (
                    <span className="text-destructive">*</span>
                  )}
                </span>
              </div>
              <ImageUploader
                images={imageFiles}
                onChange={setImageFiles}
                isUploading={isUploading}
                progress={progress}
              />
            </div>

            <PriceField form={form} />

            <div className="px-4 sm:px-6 lg:px-8">
              <BiddingOptions form={form} />
            </div>

            <OptionsSection form={form} />

            <TermsSubmit
              termsAccepted={termsAccepted}
              onTermsChange={setTermsAccepted}
              isSubmitting={isSubmitting}
              progress={progress}
            />
          </form>
        </Form>
      </main>
    </div>
  )
}
