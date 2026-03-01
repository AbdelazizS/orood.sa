import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, FileUp, Building2, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"
import apiClient from "@/lib/apiClient"
import { useRef, useState } from "react"
import { toast } from "sonner"

const BADGE_CONFIG = {
  grey: { label: "غير موثق", color: "bg-muted text-muted-foreground", icon: XCircle },
  green: { label: "البريد موثق", color: "bg-green-600 text-white", icon: CheckCircle2 },
  gold: { label: "الهوية موثقة", color: "bg-amber-600 text-white", icon: Shield },
  blue: { label: "شركة موثقة", color: "bg-blue-600 text-white", icon: Building2 },
}

export function VerificationPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("id_card")
  const [companyName, setCompanyName] = useState("")
  const [companyCity, setCompanyCity] = useState("")
  const [companyProductType, setCompanyProductType] = useState("")
  const idCardFileRef = useRef(null)
  const companyFileRef = useRef(null)

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["account", "verification-status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/verification-status")
      return data?.data
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      const { data } = await apiClient.post("/account/verify-document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "verification-status"] })
      toast.success(t("verification.submitted", "تم إرسال الوثيقة. بانتظار المراجعة."))
      setCompanyName("")
      setCompanyCity("")
      setCompanyProductType("")
      if (idCardFileRef.current) idCardFileRef.current.value = ""
      if (companyFileRef.current) companyFileRef.current.value = ""
    },
    onError: (err) => {
      const msg = err?.response?.data?.message ?? t("common.error")
      toast.error(msg)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const file = (activeTab === "company_license" ? companyFileRef : idCardFileRef).current?.files?.[0]
    if (!file) {
      toast.error(t("verification.selectFile", "اختر ملفاً"))
      return
    }
    const formData = new FormData()
    formData.append("type", activeTab)
    formData.append("document", file)
    if (activeTab === "company_license") {
      formData.append("company_name", companyName)
      formData.append("company_city", companyCity)
      formData.append("company_product_type", companyProductType)
    }
    uploadMutation.mutate(formData)
  }

  const badge = statusData?.badge ?? "grey"
  const badgeConfig = BADGE_CONFIG[badge] ?? BADGE_CONFIG.grey
  const BadgeIcon = badgeConfig.icon

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("verification.title", "التوثيق")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("verification.title", "التوثيق")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            {t("verification.currentStatus", "حالة التوثيق")}
          </CardTitle>
          <CardDescription>{t("verification.statusDesc", "مستوى التوثيق الحالي")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge className={`gap-1 ${badgeConfig.color}`}>
              <BadgeIcon className="size-4" />
              {badgeConfig.label}
            </Badge>
            {statusData?.pending && (
              <Badge variant="outline" className="gap-1">
                <Clock className="size-4" />
                {t("verification.pendingReview", "قيد المراجعة")}
              </Badge>
            )}
            {statusData?.rejected && (
              <span className="text-sm text-destructive">
                {t("verification.rejected", "مرفوض")}: {statusData.rejected.reason}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("verification.verifyOptions", "خيارات التوثيق")}</CardTitle>
          <CardDescription>{t("verification.verifyDesc", "اختر طريقة التوثيق")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="absher" disabled>
                {t("verification.absher", "أبشر")} (قريباً)
              </TabsTrigger>
              <TabsTrigger value="id_card">{t("verification.idCard", "هوية / إقامة")}</TabsTrigger>
              <TabsTrigger value="company_license">{t("verification.companyLicense", "رخصة تجارية")}</TabsTrigger>
            </TabsList>
            <TabsContent value="absher" className="mt-6">
              <p className="text-muted-foreground">
                {t("verification.absherComingSoon", "التوثيق عبر أبشر قريباً.")}
              </p>
            </TabsContent>
            <TabsContent value="id_card" className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>{t("verification.uploadId", "رفع الهوية أو الإقامة")}</Label>
                  <Input
                    ref={idCardFileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="mt-2"
                    onChange={() => {}}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF أو صورة، الحد الأقصى 10 ميجابايت
                  </p>
                </div>
                <Button type="submit" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("verification.submit", "إرسال")}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="company_license" className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>{t("verification.companyName", "اسم الشركة")}</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="شركة مثال"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label>{t("verification.companyCity", "المدينة")}</Label>
                  <Input
                    value={companyCity}
                    onChange={(e) => setCompanyCity(e.target.value)}
                    placeholder="الرياض"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label>{t("verification.productType", "نوع المنتج")}</Label>
                  <Input
                    value={companyProductType}
                    onChange={(e) => setCompanyProductType(e.target.value)}
                    placeholder="إلكترونيات، أثاث، ..."
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label>{t("verification.uploadLicense", "رفع الرخصة التجارية")}</Label>
                  <Input
                    ref={companyFileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="mt-2"
                  />
                </div>
                <Button type="submit" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("verification.submit", "إرسال")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
