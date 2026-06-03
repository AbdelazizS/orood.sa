import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { isOtherSubcategorySelection } from "@/lib/listings/subcategoryDerivedFields"

/**
 * @typedef {object} ListingSchemaField
 * @property {number} id
 * @property {string} field_key
 * @property {string} field_type
 * @property {string|null} section_key
 * @property {string} label
 * @property {string|null} placeholder
 * @property {string|null} help
 * @property {boolean} required
 * @property {Array<{value: string, label: string}>} options
 * @property {Record<string, unknown>|null} visible_when
 * @property {Record<string, unknown>} config
 */

/**
 * @typedef {object} ListingSchemaPayload
 * @property {number} schema_id
 * @property {number} schema_version
 * @property {Array<{key: string, title: string, sort_order: number, visible_when?: object}>} sections
 * @property {ListingSchemaField[]} fields
 * @property {{ location?: object, price?: object, media?: object, communication?: object }} policies
 * @property {Array<{id: number, content: string, required: boolean}>} agreements
 */

/**
 * @param {number|null|undefined} categoryId
 * @param {number|null|undefined} subcategoryId
 * @param {"offer"|"request"} listingType
 */
export function useListingSchema(categoryId, subcategoryId, listingType = "offer") {
  const { i18n } = useTranslation()
  const apiSubcategoryId =
    subcategoryId && !isOtherSubcategorySelection(subcategoryId) ? subcategoryId : null

  return useQuery({
    queryKey: ["listing-schema", categoryId, apiSubcategoryId, listingType, i18n.language],
    queryFn: async () => {
      const params = new URLSearchParams({ type: listingType })
      if (apiSubcategoryId) params.set("subcategory_id", String(apiSubcategoryId))
      const { data } = await apiClient.get(`/categories/${categoryId}/listing-schema?${params}`)
      return {
        enabled: Boolean(data?.dynamic_schema_enabled),
        schema: data?.data ?? null,
      }
    },
    enabled: Boolean(categoryId),
    staleTime: 60_000,
  })
}
