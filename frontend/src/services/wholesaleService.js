import apiClient from "@/lib/apiClient"

export async function fetchCompanyWholesaleProducts(params = {}) {
  const { data } = await apiClient.get("/company/wholesale/products", { params })
  return data
}

export async function createCompanyWholesaleProduct(payload) {
  const { data } = await apiClient.post("/company/wholesale/products", payload)
  return data
}

export async function updateCompanyWholesaleProduct(id, payload) {
  const { data } = await apiClient.put(`/company/wholesale/products/${id}`, payload)
  return data
}

export async function deleteCompanyWholesaleProduct(id) {
  const { data } = await apiClient.delete(`/company/wholesale/products/${id}`)
  return data
}

export async function createCompanyBulkOffer(payload) {
  const { data } = await apiClient.post("/company/wholesale/bulk-offers", payload)
  return data
}

export async function fetchWholesaleMarketProducts(params = {}) {
  const { data } = await apiClient.get("/wholesale/products", { params })
  return data
}

export async function fetchWholesaleProductDetails(productId) {
  const { data } = await apiClient.get(`/wholesale/products/${productId}`)
  return data
}

export async function fetchWholesaleCompanies(params = {}) {
  const { data } = await apiClient.get("/wholesale/companies", { params })
  return data
}

export async function fetchWholesaleCompanyDetails(companyId) {
  const { data } = await apiClient.get(`/wholesale/companies/${companyId}`)
  return data
}

export async function fetchWholesaleCompanyProducts(companyId, params = {}) {
  const { data } = await apiClient.get(`/wholesale/companies/${companyId}/products`, { params })
  return data
}

export async function reserveWholesaleProduct(productId, quantity = 1) {
  const { data } = await apiClient.post(`/wholesale/products/${productId}/reserve`, { quantity })
  return data
}

export async function cancelWholesaleReservation(productId) {
  const { data } = await apiClient.delete(`/wholesale/products/${productId}/reserve`)
  return data
}

export async function fetchMyWholesaleReservations() {
  const { data } = await apiClient.get("/wholesale/my-reservations")
  return data?.data ?? { waiting: [], completed: [], closed: [] }
}

export async function wholesaleCheckoutReservation(reservationId, payload) {
  const { data } = await apiClient.post(`/wholesale/reservations/${reservationId}/checkout`, payload)
  return data
}

export async function uploadProductImage(file) {
  const formData = new FormData()
  formData.append("image", file)
  const { data } = await apiClient.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data?.url
}
