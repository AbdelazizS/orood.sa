import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"
import { useFiltersStore } from "@/store/useFiltersStore"

const buildFeedParams = (filters, pageParam) => {
  const params = {
    page: pageParam,
    filter: filters.activeFilter,
    category_id: filters.categoryId,
    subcategory_id: filters.subcategoryId,
    region_id: filters.regionId,
    city_id: filters.cityId,
    search: filters.searchQuery,
  }

  Object.keys(params).forEach((key) => {
    if (params[key] === null || params[key] === "" || params[key] === "all") {
      delete params[key]
    }
  })

  return params
}

export const useHomepageFeed = () => {
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
    queryKey: ["feed", filterKey],
    queryFn: async ({ pageParam = 1 }) => {
      const params = buildFeedParams(filters, pageParam)
      const { data } = await apiClient.get("/homepage/feed", { params })
      return data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.has_more ? lastPage.meta.current_page + 1 : undefined,
  })

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return data?.data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })

  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await apiClient.get("/companies")
      return data?.data ?? []
    },
    staleTime: 1000 * 60 * 5,
  })

  return {
    feedQuery,
    categoriesQuery,
    regionsQuery,
    companiesQuery,
  }
}
