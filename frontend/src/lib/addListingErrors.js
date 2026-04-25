/**
 * Parse API validation errors and map to localized field-level messages.
 * Laravel returns: { message, errors: { field: ["msg"] } }
 */
const FIELD_MAP = {
  title: "title",
  description: "description",
  image_url: "imageUrls",
  image_urls: "imageUrls",
  "image_urls.0": "imageUrls",
  "image_urls.1": "imageUrls",
  "image_urls.*": "imageUrls",
  category_id: "categoryId",
  subcategory_id: "subcategoryId",
  region_id: "regionId",
  city_id: "cityId",
  contact_phone: "contactMethods",
  contact_messages: "contactMethods",
  contact_phone_number: "contactPhoneNumber",
}

const MESSAGE_MAP = {
  "The title field is required.": "addListing.errors.titleRequired",
  "The description field is required.": "addListing.errors.descriptionRequired",
  "The image url field format is invalid.": "addListing.errors.imageUrlInvalid",
  "The image url field must be a valid URL.": "addListing.errors.imageUrlInvalid",
  "The image urls field is required when type is offer.": "addListing.errors.imagesRequired",
  "The image urls field is required.": "addListing.errors.imagesRequired",
  "The image urls.0 field format is invalid.": "addListing.errors.imageUrlInvalid",
  "The image urls.0 field must be a valid URL.": "addListing.errors.imageUrlInvalid",
}

export function parseAddListingErrors(apiError, t) {
  const errors = apiError?.response?.data?.errors
  if (!errors || typeof errors !== "object") return {}

  const fieldErrors = {}
  for (const [key, messages] of Object.entries(errors)) {
    const msg = Array.isArray(messages) ? messages[0] : messages
    const field = FIELD_MAP[key] ?? key
    const tKey = MESSAGE_MAP[msg] ?? null
    fieldErrors[field] = tKey ? t(tKey) : msg
  }
  return fieldErrors
}
