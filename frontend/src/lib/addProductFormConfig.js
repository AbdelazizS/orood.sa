/**
 * Config-driven form behavior for Offer vs Request.
 * Single source of truth for field requirements and visibility.
 */
export const formConfig = {
  offer: {
    requireImages: true,
    minImages: 1,
    allowBidding: true,
    allowShipping: true,
    allowReturn: true,
    allowViewLocation: true,
    priceOptional: true,
    bidDefaultEnabled: false,
    descriptionHintKey: "addProduct.offerDescriptionHint",
    imagesHintKey: "addProduct.offerImagesHint",
  },
  request: {
    requireImages: false,
    minImages: 0,
    allowBidding: true,
    allowShipping: false,
    allowReturn: false,
    allowViewLocation: true,
    priceOptional: true,
    bidDefaultEnabled: true,
    descriptionHintKey: "addProduct.requestDescriptionHint",
    imagesHintKey: "addProduct.requestImagesHint",
  },
}

export function getFormConfig(type) {
  return formConfig[type] ?? formConfig.offer
}
