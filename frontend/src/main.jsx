import { StrictMode, Suspense, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import "./index.css"
import "@/lib/i18n"
import i18n from "@/lib/i18n"
import { router } from "@/routes"
import { AppDirectionProvider } from "@/providers/DirectionProvider"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { AuthInit } from "@/components/AuthInit"
import { PresenceHeartbeat } from "@/components/PresenceHeartbeat"
import { ThemeProvider } from "@/providers/ThemeProvider"
import { Preloader } from "@/components/Preloader"
import { Toaster } from "@/components/ui/sonner"

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
      // Refetch active queries so server-localized fields switch immediately.
      queryClient.invalidateQueries()
    }
    i18n.on("languageChanged", handleLanguageChanged)
    return () => {
      i18n.off("languageChanged", handleLanguageChanged)
    }
  }, [])

  return (
    <>
      {!preloaderDone && (
        <Preloader onComplete={() => setPreloaderDone(true)} minDuration={1400} />
      )}
      <Suspense fallback={null}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Toaster richColors position="top-right" />
            <LanguageProvider>
              <AppDirectionProvider>
                <AuthInit />
                <PresenceHeartbeat />
                <RouterProvider router={router} fallbackElement={<AppFallback />} />
              </AppDirectionProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </Suspense>
    </>
  )
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)
