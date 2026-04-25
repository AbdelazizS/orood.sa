import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/useAuthStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppDirection } from "@/providers/DirectionProvider"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"

function verificationLevelLabel(t, level) {
  if (!level) return ""
  const key = `dashboard.verificationPage.level.${level}`
  const translated = t(key)
  return translated === key ? level : translated
}

/** i18n keys for Absher “coming soon” modal pillars (must stay in sync with locales). */
const ABSHER_DIALOG_PILLAR_KEYS = [
  "dashboard.verificationPage.absherDialogPillar1",
  "dashboard.verificationPage.absherDialogPillar2",
  "dashboard.verificationPage.absherDialogPillar3",
  "dashboard.verificationPage.absherDialogPillar4",
]

export function VerificationPage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuthStore()
  const queryClient = useQueryClient()
  const { direction } = useAppDirection()
  const [activeTab, setActiveTab] = useState("absher")
  const [absherDialogOpen, setAbsherDialogOpen] = useState(false)

  const [idCardFile, setIdCardFile] = useState(null)
  const [companyFile, setCompanyFile] = useState(null)
  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    company_city: "",
    company_product_type: "",
  })

  const { data: statusPayload } = useQuery({
    queryKey: ["account", "verification-status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/verification-status")
      return data?.data ?? null
    },
    refetchInterval: 25_000,
  })

  const pending = statusPayload?.pending
  const rejected = statusPayload?.rejected

  const absherMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/account/verify-absher")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "verification-status"] })
      void refreshUser?.()?.catch(() => {})
    },
    onError: (err) => {
      const status = err?.response?.status
      if (status === 501) {
        setAbsherDialogOpen(true)
        return
      }
      const msg = err?.response?.data?.message
      toast.error(typeof msg === "string" ? msg : t("dashboard.verificationPage.toastSubmitError"))
    },
  })

  const documentMutation = useMutation({
    mutationFn: async ({ type, file, extra }) => {
      const formData = new FormData()
      formData.append("type", type)
      formData.append("document", file)
      if (extra?.company_name) formData.append("company_name", extra.company_name)
      if (extra?.company_city) formData.append("company_city", extra.company_city)
      if (extra?.company_product_type) formData.append("company_product_type", extra.company_product_type)
      const { data } = await apiClient.post("/account/verify-document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data
    },
    onSuccess: async () => {
      toast.success(t("dashboard.verificationPage.toastSubmitSuccess"))
      setIdCardFile(null)
      setCompanyFile(null)
      setCompanyForm({ company_name: "", company_city: "", company_product_type: "" })
      queryClient.invalidateQueries({ queryKey: ["account", "verification-status"] })
      try {
        await refreshUser?.()
      } catch {
        /* ignore */
      }
    },
    onError: (err) => {
      const msg = err?.response?.data?.message
      toast.error(typeof msg === "string" ? msg : t("dashboard.verificationPage.toastSubmitError"))
    },
  })

  const submitIdCard = (e) => {
    e.preventDefault()
    if (!idCardFile) {
      toast.error(t("dashboard.verificationPage.fileRequired"))
      return
    }
    documentMutation.mutate({ type: "id_card", file: idCardFile })
  }

  const submitCompany = (e) => {
    e.preventDefault()
    if (!companyFile) {
      toast.error(t("dashboard.verificationPage.fileRequired"))
      return
    }
    if (!companyForm.company_name?.trim() || !companyForm.company_city?.trim() || !companyForm.company_product_type?.trim()) {
      toast.error(t("dashboard.verificationPage.companyFieldsRequired"))
      return
    }
    documentMutation.mutate({
      type: "company_license",
      file: companyFile,
      extra: {
        company_name: companyForm.company_name.trim(),
        company_city: companyForm.company_city.trim(),
        company_product_type: companyForm.company_product_type.trim(),
      },
    })
  }

  if (user?.is_verified) {
    return (
      <div className="container max-w-3xl space-y-6 py-8" dir={direction}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("dashboard.verification")}</h1>
          <p className="mt-1 text-muted-foreground">{t("dashboard.verificationPage.manageIntro")}</p>
        </div>

        <Card className="border-green-500/20 bg-green-500/5 shadow-sm">
          <CardContent className="flex flex-col items-center space-y-4 pt-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-700">{t("dashboard.verificationPage.verifiedTitle")}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-green-600/80">{t("dashboard.verificationPage.verifiedSubtitle")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl space-y-8 py-6" dir={direction}>
      <div>
        <div className="mb-2 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 shrink-0 text-primary" />
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("dashboard.verification")}</h1>
        </div>
        <p className="text-muted-foreground">{t("dashboard.verificationPage.pageIntro")}</p>
      </div>

      {pending && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>{t("dashboard.verificationPage.statusPendingTitle")}</AlertTitle>
          <AlertDescription>{t("dashboard.verificationPage.statusPendingBody")}</AlertDescription>
        </Alert>
      )}

      {rejected && !pending && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{t("dashboard.verificationPage.statusRejectedTitle")}</AlertTitle>
          <AlertDescription>
            {rejected.reason ? String(rejected.reason) : t("dashboard.verificationPage.statusRejectedBody")}
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid h-auto min-h-14 w-full grid-cols-1 gap-1 bg-background p-1 sm:grid-cols-3">
            <TabsTrigger value="absher" className="font-semibold">
              {t("dashboard.verificationPage.tabAbsher")}
            </TabsTrigger>
            <TabsTrigger value="id_card" className="font-semibold">
              {t("dashboard.verificationPage.tabIdCard")}
            </TabsTrigger>
            <TabsTrigger value="company_license" className="font-semibold">
              {t("dashboard.verificationPage.tabCompany")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="absher">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4 text-center sm:text-start">
                <CardTitle className="text-xl">{t("dashboard.verificationPage.absherTitle")}</CardTitle>
                <CardDescription className="mt-2 text-base">{t("dashboard.verificationPage.absherDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-8">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
                  <ShieldCheck size={48} className="text-white" />
                </div>
                <Button
                  size="lg"
                  className="h-14 w-full bg-emerald-600 px-12 text-lg font-bold shadow-xl hover:bg-emerald-700 sm:w-auto"
                  type="button"
                  onClick={() => setAbsherDialogOpen(true)}
                >
                  {t("dashboard.verificationPage.absherButton")}
                </Button>
                <p className="mt-4 max-w-md text-center text-sm text-muted-foreground">{t("dashboard.verificationPage.absherComingSoonHint")}</p>
              </CardContent>
              <CardFooter className="justify-center border-t border-border bg-muted/50 py-4 text-xs text-muted-foreground">
                {t("dashboard.verificationPage.absherFooter")}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="id_card">
            <Card className="border-border shadow-sm">
              <form onSubmit={submitIdCard}>
                <CardHeader className="pb-4 text-center sm:text-start">
                  <CardTitle className="text-xl">{t("dashboard.verificationPage.idDocTitle")}</CardTitle>
                  <CardDescription className="mt-2 text-base">{t("dashboard.verificationPage.idDocDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">{t("dashboard.verificationPage.singleDocumentLabel")}</Label>
                    <p className="text-sm text-muted-foreground">{t("dashboard.verificationPage.singleDocumentHint")}</p>
                    <div className="relative flex min-h-[10rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:bg-muted/50">
                      {idCardFile ? (
                        <div className="flex items-center gap-2 font-medium text-primary">
                          <CheckCircle2 size={18} /> {idCardFile.name}
                        </div>
                      ) : (
                        <>
                          <Upload size={28} className="mb-3 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{t("dashboard.verificationPage.uploadPrompt")}</span>
                          <span className="mt-1 text-xs text-muted-foreground">{t("dashboard.verificationPage.uploadFormatsAdmin")}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t border-border bg-muted/20 pt-4 rtl:flex-row-reverse">
                  <Button type="submit" disabled={documentMutation.isPending} className="h-12 px-8 font-bold">
                    {documentMutation.isPending ? t("dashboard.verificationPage.submitting") : t("dashboard.verificationPage.submitRequest")}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="company_license">
            <Card className="border-border shadow-sm">
              <form onSubmit={submitCompany}>
                <CardHeader className="pb-4 text-center sm:text-start">
                  <CardTitle className="text-xl">{t("dashboard.verificationPage.companyTitle")}</CardTitle>
                  <CardDescription className="mt-2 text-base">{t("dashboard.verificationPage.companyDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="co-name">{t("dashboard.verificationPage.companyName")}</Label>
                      <Input
                        id="co-name"
                        value={companyForm.company_name}
                        onChange={(e) => setCompanyForm((s) => ({ ...s, company_name: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="co-city">{t("dashboard.verificationPage.companyCity")}</Label>
                      <Input
                        id="co-city"
                        value={companyForm.company_city}
                        onChange={(e) => setCompanyForm((s) => ({ ...s, company_city: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="co-type">{t("dashboard.verificationPage.companyProductType")}</Label>
                    <Input
                      id="co-type"
                      value={companyForm.company_product_type}
                      onChange={(e) => setCompanyForm((s) => ({ ...s, company_product_type: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">{t("dashboard.verificationPage.licenseFileLabel")}</Label>
                    <div className="relative flex min-h-[10rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:bg-muted/50">
                      {companyFile ? (
                        <div className="flex items-center gap-2 font-medium text-primary">
                          <FileText size={18} /> {companyFile.name}
                        </div>
                      ) : (
                        <>
                          <Upload size={28} className="mb-3 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{t("dashboard.verificationPage.uploadPrompt")}</span>
                          <span className="mt-1 text-xs text-muted-foreground">{t("dashboard.verificationPage.uploadFormatsAdmin")}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(e) => setCompanyFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t border-border bg-muted/20 pt-4 rtl:flex-row-reverse">
                  <Button type="submit" disabled={documentMutation.isPending} className="h-12 px-8 font-bold">
                    {documentMutation.isPending ? t("dashboard.verificationPage.submitting") : t("dashboard.verificationPage.submitRequest")}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {statusPayload?.verification_level && (
        <p className="text-center text-xs text-muted-foreground">
          {t("dashboard.verificationPage.currentLevel")}{" "}
          <Badge variant="secondary">{verificationLevelLabel(t, statusPayload.verification_level)}</Badge>
        </p>
      )}

      <Dialog open={absherDialogOpen} onOpenChange={setAbsherDialogOpen}>
        <DialogContent
          className={cn(
            "gap-0 overflow-hidden p-0 sm:max-w-lg",
            "border-emerald-900/20 shadow-xl",
          )}
          dir={direction}
        >
          <div
            className={cn(
              "relative px-6 pb-8 pt-10 text-white",
              "bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-900",
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,255,255,0.2),transparent_55%)]" aria-hidden />
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-inner backdrop-blur-sm">
                <ShieldCheck className="size-9 shrink-0 text-white" aria-hidden />
              </div>
              <Badge className="mt-4 border-0 bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white hover:bg-white/25">
                {t("dashboard.verificationPage.absherDialogBadge")}
              </Badge>
              <DialogTitle className="mt-4 max-w-md text-balance text-xl font-bold leading-snug text-white sm:text-2xl">
                {t("dashboard.verificationPage.absherDialogTitle")}
              </DialogTitle>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <DialogDescription className="text-start text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("dashboard.verificationPage.absherDialogLead")}
            </DialogDescription>
            <ul className="space-y-3 text-start text-sm text-foreground sm:text-[0.9375rem]">
              {ABSHER_DIALOG_PILLAR_KEYS.map((key) => (
                <li key={key} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                  <span className="leading-snug">{t(key)}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border pt-4 text-start text-xs leading-relaxed text-muted-foreground">
              {t("dashboard.verificationPage.absherDialogFooterNote")}
            </p>
          </div>

          <DialogFooter className="border-t border-border bg-muted/40 px-6 py-4 sm:justify-center">
            <Button type="button" className="w-full font-semibold sm:w-auto sm:min-w-[10rem]" onClick={() => setAbsherDialogOpen(false)}>
              {t("dashboard.verificationPage.absherDialogClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
