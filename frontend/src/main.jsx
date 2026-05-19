import { StrictMode, Suspense, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { HelmetProvider } from "react-helmet-async"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import "./index.css"
import "@/lib/i18n"
import i18n from "@/lib/i18n"
import { router } from "@/routes"
import { AppDirectionProvider } from "@/providers/DirectionProvider"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { AuthInit } from "@/components/AuthInit"
import { MapsConfigInit } from "@/components/MapsConfigInit"
import { PresenceHeartbeat } from "@/components/PresenceHeartbeat"
import { ThemeProvider } from "@/providers/ThemeProvider"
import { BrandingProvider } from "@/providers/BrandingProvider"
import { Preloader } from "@/components/Preloader"
import { Toaster } from "@/components/ui/sonner"
import { fetchPublicBranding } from "@/services/brandingService"
import { brandingQueryKey } from "@/hooks/useBranding"
import { writeBrandingCache } from "@/lib/brandingCache"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.response?.status
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) return false
        return failureCount < 2
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      refetchOnWindowFocus: false,
    },
  },
})

function brandingLocale() {
  return i18n.language?.startsWith("en") ? "en" : "ar"
}

async function prefetchBranding() {
  const locale = brandingLocale()
  const key = brandingQueryKey(locale)
  try {
    await queryClient.prefetchQuery({
      queryKey: key,
      queryFn: fetchPublicBranding,
    })
    const data = queryClient.getQueryData(key)
    if (data) writeBrandingCache(locale, data)
  } catch {
    // App falls back to BRANDING_FALLBACK in useBranding
  }
}

function AppFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 size-10 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

function AppRoot() {
  const [preloaderDone, setPreloaderDone] = useState(false)

  useEffect(() => {
    const handleLanguageChanged = () => {
      queryClient.invalidateQueries()
    }
    i18n.on("languageChanged", handleLanguageChanged)
    return () => {
      i18n.off("languageChanged", handleLanguageChanged)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <BrandingProvider>
            {!preloaderDone && (
              <Preloader onComplete={() => setPreloaderDone(true)} minDuration={1400} />
            )}
            <Toaster richColors position="top-right" />
            <Suspense fallback={null}>
              <LanguageProvider>
                <AppDirectionProvider>
                  <AuthInit />
                  <MapsConfigInit />
                  <PresenceHeartbeat />
                  <RouterProvider router={router} fallbackElement={<AppFallback />} />
                </AppDirectionProvider>
              </LanguageProvider>
            </Suspense>
          </BrandingProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  )
}

async function bootstrap() {
  await prefetchBranding()
  const root = document.getElementById("root")
  if (!root) return
  createRoot(root).render(
    <StrictMode>
      <AppRoot />
    </StrictMode>,
  )
}

bootstrap()
