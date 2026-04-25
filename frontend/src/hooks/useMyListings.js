import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"

export function useMyListings() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const status = searchParams.get("status") || "ALL"
  const search = searchParams.get("search") || ""
  const sort = searchParams.get("sort") || "newest"
  const page = parseInt(searchParams.get("page") || "1", 10)

  const query = useQuery({
    queryKey: ["my-listings", { status, search, sort, page }],
    queryFn: async () => {
      const { data } = await apiClient.get("/dashboard/listings", {
        params: { status, search: search || undefined, sort, page, per_page: 12 },
      })
      return data
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, newStatus }) =>
      apiClient.patch(`/dashboard/listings/${id}/status`, { status: newStatus }),
    onSuccess: (res) => {
      toast.success(res?.data?.message ?? t("dashboard.listingsToast.updated"))
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("dashboard.listingsToast.error"))
    },
  })

  const bump = useMutation({
    mutationFn: (id) => apiClient.post(`/dashboard/listings/${id}/bump`),
    onSuccess: () => {
      toast.success(t("dashboard.listingsToast.bumpSuccess"))
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
    },
    onError: (err) => {
      toast.error(
        err?.response?.status === 429
          ? t("dashboard.listingsToast.bumpRateLimited")
          : err?.response?.data?.message ?? t("dashboard.listingsToast.error")
      )
    },
  })

  const deleteListing = useMutation({
    mutationFn: (id) => apiClient.delete(`/dashboard/listings/${id}`),
    onSuccess: () => {
      toast.success(t("dashboard.listingsToast.deleted"))
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("dashboard.listingsToast.error"))
    },
  })

  const markSold = useMutation({
    mutationFn: (id) => apiClient.patch(`/dashboard/listings/${id}/mark-sold`),
    onSuccess: () => {
      toast.success(t("dashboard.listingsToast.markSold"))
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("dashboard.listingsToast.error"))
    },
  })

  const duplicate = useMutation({
    mutationFn: (id) => apiClient.post(`/dashboard/listings/${id}/duplicate`),
    onSuccess: () => {
      toast.success(t("dashboard.listingsToast.duplicated"))
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("dashboard.listingsToast.error"))
    },
  })

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value === "" || value === "ALL" || value === "newest") {
      next.delete(key)
    } else {
      next.set(key, String(value))
    }
    next.delete("page")
    setSearchParams(next)
  }

  return {
    listings: query.data?.listings ?? [],
    counts: query.data?.counts ?? { all: 0, active: 0, sold: 0, hidden: 0 },
    pagination: query.data?.pagination ?? null,
    status,
    search,
    sort,
    page,
    setFilter,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    toggleStatus,
    bump,
    deleteListing,
    markSold,
    duplicate,
  }
}
