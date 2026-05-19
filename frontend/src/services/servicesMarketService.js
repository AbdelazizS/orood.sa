import apiClient from "@/lib/apiClient"

export async function fetchServiceCategories() {
  const { data } = await apiClient.get("/services/categories")
  return data?.data ?? []
}

export async function fetchServiceProviders(params = {}) {
  const { data } = await apiClient.get("/services/providers", { params })
  return data
}

export async function fetchServiceProvider(id) {
  const { data } = await apiClient.get(`/services/providers/${id}`)
  return data?.data
}

export async function createServiceRequest(payload) {
  const { data } = await apiClient.post("/services/requests", payload)
  return data
}

export async function saveServiceProvider(payload) {
  const { data } = await apiClient.post("/services/providers", payload)
  return data
}

export async function fetchServiceProviderDashboard() {
  const { data } = await apiClient.get("/services/provider/dashboard")
  return data?.data
}

export async function updateServiceRequestStatus(requestId, status) {
  const { data } = await apiClient.patch(`/services/requests/${requestId}/status`, { status })
  return data
}
