import apiClient from "@/lib/apiClient"

export async function resolveSeo(path, { lang = "ar", ...context } = {}) {
  const { data } = await apiClient.get("/seo/resolve", {
    params: { path, lang, ...context },
  })
  return data?.data ?? data
}

export async function fetchSeoDashboard() {
  const { data } = await apiClient.get("/admin/seo/dashboard")
  return data?.data ?? data
}

export async function fetchSeoGlobal() {
  const { data } = await apiClient.get("/admin/seo/global")
  return data?.data ?? data
}

export async function updateSeoGlobal(payload) {
  const { data } = await apiClient.put("/admin/seo/global", payload)
  return data?.data ?? data
}

export async function fetchSeoPages() {
  const { data } = await apiClient.get("/admin/seo/pages")
  return data?.data ?? data
}

export async function saveSeoPage(pageKey, payload) {
  const { data } = await apiClient.put(`/admin/seo/pages/${encodeURIComponent(pageKey)}`, payload)
  return data?.data ?? data
}

export async function createSeoPage(payload) {
  const { data } = await apiClient.post("/admin/seo/pages", payload)
  return data?.data ?? data
}

export async function bulkSaveSeoPages(rows) {
  const { data } = await apiClient.post("/admin/seo/pages/bulk", { rows })
  return data
}

export async function syncCategorySeoPages() {
  const { data } = await apiClient.post("/admin/seo/pages/sync-categories")
  return data
}

export async function fetchSitemapSettings() {
  const { data } = await apiClient.get("/admin/seo/sitemap")
  return data?.data ?? data
}

export async function updateSitemapSettings(payload) {
  const { data } = await apiClient.put("/admin/seo/sitemap", payload)
  return data?.data ?? data
}

export async function generateSitemap(baseUrl) {
  const { data } = await apiClient.post("/admin/seo/sitemap/generate", baseUrl ? { base_url: baseUrl } : {})
  return data
}

export async function fetchRobotsTxt() {
  const { data } = await apiClient.get("/admin/seo/robots")
  return data?.data ?? data
}

export async function updateRobotsTxt(content) {
  const { data } = await apiClient.put("/admin/seo/robots", { content })
  return data
}

export async function fetchSeoAuditIssues() {
  const { data } = await apiClient.get("/admin/seo/audit")
  return data?.data ?? data
}

export async function runSeoAudit() {
  const { data } = await apiClient.post("/admin/seo/audit/run")
  return data
}

export async function clearSeoCache() {
  const { data } = await apiClient.post("/admin/seo/cache/clear")
  return data
}

export async function uploadSeoOgImage(file) {
  const form = new FormData()
  form.append("file", file)
  const { data } = await apiClient.post("/admin/seo/upload/og-image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data?.data ?? data
}
