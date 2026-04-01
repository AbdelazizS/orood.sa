import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import apiClient from "@/lib/apiClient"
import { Shield, CheckCircle2, XCircle, Loader2, FileText, Building2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function AdminVerificationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [rejecting, setRejecting] = useState(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "verifications"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/verifications")
      return res
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/verifications/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "verifications"] })
      toast.success(t("admin.verificationApproved", "تمت الموافقة"))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(`/admin/verifications/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "verifications"] })
      setRejecting(null)
      setRejectReason("")
      toast.success(t("admin.verificationRejected", "تم الرفض"))
    },
  })

  const verifications = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.verifications", "التحقق من الوثائق")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.verifications", "التحقق من الوثائق")}</h1>

      {verifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="size-16 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {t("admin.noPendingVerifications", "لا توجد طلبات تحقق معلقة")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {verifications.map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {v.type === "company_license" ? (
                    <Building2 className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                  {v.user?.name} — {v.type === "company_license" ? t("verification.companyLicense") : t("verification.idCard")}
                </CardTitle>
                <CardDescription>
                  {v.created_at && new Date(v.created_at).toLocaleString("ar-SA")}
                  {v.company_name && ` • ${v.company_name}`}
                  {v.company_city && ` • ${v.company_city}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {v.document_url && (
                  <a
                    href={v.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {t("admin.viewDocument", "عرض الوثيقة")}
                  </a>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(v.id)}
                    disabled={approveMutation.isPending}
                    className="gap-1"
                  >
                    {approveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    {t("admin.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRejecting(v)}
                    className="gap-1"
                  >
                    <XCircle className="size-4" />
                    {t("admin.reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.rejectVerification", "رفض التحقق")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.rejectVerificationDesc", "سيتم إبلاغ المستخدم بالرفض. يمكنك إضافة سبب اختياري.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>{t("admin.rejectReason", "السبب (اختياري)")}</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="الوثيقة غير واضحة..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejecting && rejectMutation.mutate({ id: rejecting.id, reason: rejectReason })}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("admin.reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
