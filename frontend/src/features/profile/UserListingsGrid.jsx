import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/feed/cards/ProductCard"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import { Package, MoreVertical, Pencil, ArrowUp, Trash2, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * UserListingsGrid — listings with All/Offers/Requests tabs.
 * When isOwner, shows Edit, Bump, Delete, Duplicate controls.
 * @param {boolean} [hideTitle] — hide duplicate section title when embedded under another tab label.
 */
export function UserListingsGrid({ listings = [], isOwner = false, hideTitle = false }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("all")

  const bumpMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/products/${id}/bump`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] })
      toast.success(t("profile.bumped", "تم التحديث بنجاح"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/products/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] })
      await queryClient.invalidateQueries({ queryKey: ["products", "mine"] })
      toast.success(t("profile.deleted", "تم الحذف"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const filtered =
    tab === "offers"
      ? listings.filter((p) => p.type === "offer")
      : tab === "requests"
        ? listings.filter((p) => p.type === "request")
        : listings

  const headerRow = (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center",
        hideTitle ? "sm:justify-end" : "sm:justify-between",
      )}
    >
      {!hideTitle ? (
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Package className="size-5" />
          {t("profile.listings", "Listings")}
        </h2>
      ) : (
        <span className="sr-only">{t("profile.listings", "Listings")}</span>
      )}
      {listings.length > 0 && (
        <Tabs value={tab} onValueChange={setTab} className="w-full sm:ms-auto sm:w-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">
              {t("common.all")} ({listings.length})
            </TabsTrigger>
            <TabsTrigger value="offers">
              {t("feed.offer")} ({listings.filter((p) => p.type === "offer").length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              {t("feed.request")} ({listings.filter((p) => p.type === "request").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader>{headerRow}</CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Package className="size-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {tab === "all"
                ? t("profile.noListings", "No listings yet")
                : t("profile.noListingsInTab", "No listings in this category")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {filtered.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard product={product} />
                {isOwner && (
                  <div
                    className="absolute end-2 top-2 z-10"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/products/${product.id}/edit`}>
                            <Pencil className="me-2 size-4" />
                            {t("profile.edit", "تعديل")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => bumpMutation.mutate(product.id)}
                          disabled={bumpMutation.isPending}
                        >
                          <ArrowUp className="me-2 size-4" />
                          {t("profile.bump", "تحديث (رفع)")}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/add?duplicate=${product.id}`}>
                            <Copy className="me-2 size-4" />
                            {t("profile.duplicate", "نسخ")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (window.confirm(t("profile.confirmDelete", "هل تريد حذف هذا الإعلان؟"))) {
                              deleteMutation.mutate(product.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="me-2 size-4" />
                          {t("profile.delete", "حذف")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
