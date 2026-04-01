import { StrictMode, Suspense, useState } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import "./index.css"
import "@/lib/i18n"
import { router } from "@/routes"
import { AppDirectionProvider } from "@/providers/DirectionProvider"
import { AuthInit } from "@/components/AuthInit"
import { ThemeProvider } from "@/providers/ThemeProvider"
import { Preloader } from "@/components/Preloader"
import { Toaster } from "@/components/ui/sonner"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
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

  return (
    <>
      {!preloaderDone && (
        <Preloader onComplete={() => setPreloaderDone(true)} minDuration={1400} />
      )}
      <Suspense fallback={null}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Toaster richColors position="top-right" />
            <AppDirectionProvider>
              <AuthInit />
              <RouterProvider router={router} fallbackElement={<AppFallback />} />
            </AppDirectionProvider>
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
