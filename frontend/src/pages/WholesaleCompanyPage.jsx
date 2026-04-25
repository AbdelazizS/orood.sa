import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useAuthStore } from "@/store/useAuthStore"
import {
  cancelWholesaleReservation,
  fetchWholesaleCompanyDetails,
  fetchWholesaleCompanyProducts,
  reserveWholesaleProduct,
} from "@/services/wholesaleService"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { WholesaleCompanyCard } from "@/components/wholesale/WholesaleCompanyCard"
import { WholesaleProductCard } from "@/components/wholesale/WholesaleProductCard"
import { getDirection, isRtlLanguage } from "@/lib/direction"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

const sortOptions = ["newest", "price_asc", "price_desc", "discount"]

export function WholesaleCompanyPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const isRTL = isRtlLanguage(i18n.language)
  const navigate = useNavigate()
  const CrumbIcon = isRTL ? ChevronLeft : ChevronRight
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("newest")

  const params = useMemo(() => ({
    search: search || undefined,
    sort,
    per_page: 24,
  }), [search, sort])

  const companyQuery = useQuery({
    queryKey: ["wholesale", "company", id],
    queryFn: () => fetchWholesaleCompanyDetails(id),
    enabled: Boolean(id),
  })
  const productsQuery = useQuery({
    queryKey: ["wholesale", "company", id, "products", params],
    queryFn: () => fetchWholesaleCompanyProducts(id, params),
    enabled: Boolean(id),
  })

  const reserveMutation = useMutation({
    mutationFn: ({ productId, quantity }) => reserveWholesaleProduct(productId, quantity),
    onSuccess: () => {
      toast.success(t("wholesale.market.reserveSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "company", id, "products"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.reserveError"))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (productId) => cancelWholesaleReservation(productId),
    onSuccess: () => {
      toast.success(t("wholesale.market.cancelSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "company", id, "products"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.cancelError"))
    },
  })

  const company = companyQuery.data?.data?.company
  const products = productsQuery.data?.data ?? []

  const handleReserve = (productId) => {
    if (!user) {
      toast.error(t("wholesale.market.loginRequired"))
      navigate("/login")
      return
    }
    reserveMutation.mutate({ productId, quantity: 1 })
  }

  const handleCancel = (productId) => {
    if (!user) {
      toast.error(t("wholesale.market.loginRequired"))
      navigate("/login")
      return
    }
    cancelMutation.mutate(productId)
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:py-8" dir={dir}>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">{t("nav.home")}</Link>
        <CrumbIcon className="size-4" />
        <Link to="/wholesale" className="hover:text-foreground">{t("wholesale.market.title")}</Link>
        <CrumbIcon className="size-4" />
        <Link to="/wholesale/companies" className="hover:text-foreground">{t("wholesale.companies.title")}</Link>
        <CrumbIcon className="size-4" />
        <span className="font-medium text-foreground">{company?.name ?? t("wholesale.companyProfile.title")}</span>
      </div>

      {company ? <WholesaleCompanyCard company={company} t={t} dir={dir} /> : null}

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-9"
              placeholder={t("wholesale.companyProfile.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger><SelectValue placeholder={t("wholesale.market.sortLabel")} /></SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>{t(`wholesale.market.sort.${opt}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <WholesaleProductCard
            key={product.id}
            product={product}
            t={t}
              dir={dir}
              onReserve={handleReserve}
              onCancel={handleCancel}
            reservePending={reserveMutation.isPending}
            cancelPending={cancelMutation.isPending}
          />
        ))}
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("wholesale.companyProfile.empty")}
          </CardContent>
        </Card>
      ) : null}

      <div className={cn("flex", isRTL ? "justify-end" : "justify-start")}>
        <Button variant="outline" asChild>
          <Link to="/wholesale/companies">{t("wholesale.companyProfile.backToCompanies")}</Link>
        </Button>
      </div>
    </section>
  )
}
