import apiClient from "@/lib/apiClient"

export async function fetchPublicBranding() {
  const { data } = await apiClient.get("/branding")
  return data?.data ?? {}
}

export async function fetchAdminBranding() {
  const { data } = await apiClient.get("/admin/branding")
  return data?.data ?? {}
}

export async function updateBranding(payload) {
  const { data } = await apiClient.put("/admin/branding", payload)
  return data?.data ?? {}
}

export async function uploadBrandingAsset(file, assetKey) {
  const form = new FormData()
  form.append("file", file)
  form.append("asset_key", assetKey)
  const { data } = await apiClient.post("/admin/branding/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data?.data ?? {}
}
