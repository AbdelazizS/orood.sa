import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useTranslation } from "react-i18next"

const PER_PAGE = 12

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

const buildFeedParams = (filters, pageParam) => {
  const params = {
    page: pageParam,
    per_page: PER_PAGE,
    filter: filters.activeFilter,
    category_id: filters.categoryId,
    subcategory_id: filters.subcategoryId,
    region_id: filters.regionId,
    city_id: filters.cityId,
    search: filters.searchQuery,
  }

  Object.keys(params).forEach((key) => {
    const v = params[key]
    if (v === null || v === "" || v === "all" || (typeof v === "number" && Number.isNaN(v))) {
      delete params[key]
    }
  })
  return params
}

export const useHomepageFeed = () => {
  const { i18n } = useTranslation()
  const filters = useFiltersStore()
  const filterKey = JSON.stringify({
    categoryId: filters.categoryId,
    subcategoryId: filters.subcategoryId,
    regionId: filters.regionId,
    cityId: filters.cityId,
    activeFilter: filters.activeFilter,
    searchQuery: filters.searchQuery,
  })

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed", filterKey, i18n.language],
    queryFn: async ({ pageParam = 1 }) => {
      const params = buildFeedParams(filters, pageParam)
      const { data } = await apiClient.get("/listings", { params })
      return data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.has_more ? lastPage.meta.current_page + 1 : undefined,
  })

  const categoriesQuery = useQuery({
    queryKey: ["categories", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return unwrapList(data)
    },
    staleTime: 1000 * 60 * 10,
  })

  const regionsQuery = useQuery({
    queryKey: ["regions", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return unwrapList(data)
    },
    staleTime: 1000 * 60 * 10,
  })

  const companiesQuery = useQuery({
    queryKey: ["companies", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/companies")
      return unwrapList(data)
    },
    staleTime: 1000 * 60 * 5,
  })

  const featuresQuery = useQuery({
    queryKey: ["homepage", "features", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/homepage/features")
      return data?.data ?? { show_wholesale: true, show_company_directory: true }
    },
    staleTime: 1000 * 60 * 5,
  })

  const sectionsQuery = useQuery({
    queryKey: ["homepage", "sections", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/homepage/sections")
      return data?.data ?? {}
    },
    staleTime: 1000 * 60 * 5,
  })

  return {
    feedQuery,
    categoriesQuery,
    regionsQuery,
    companiesQuery,
    featuresQuery,
    sectionsQuery,
  }
}
