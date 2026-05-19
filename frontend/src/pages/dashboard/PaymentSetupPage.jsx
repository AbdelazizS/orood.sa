import { useEffect, useMemo, useState } from "react"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { useTranslation } from "react-i18next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"

import { Label } from "@/components/ui/label"

import { Switch } from "@/components/ui/switch"

import { Loader2, Landmark, Wallet, Truck, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"

import { toast } from "sonner"

import { DynamicFormRenderer } from "@/components/finance/DynamicFormRenderer"
import { mapFinanceApiErrors, validateDynamicFormFields } from "@/lib/finance/dynamicFieldErrors"
import { fetchPayoutProfile, savePayoutProfile } from "@/services/financeService"

import { Badge } from "@/components/ui/badge"

import { cn } from "@/lib/utils"



function bankFieldsComplete(fieldDefs, values) {

  const required = fieldDefs.filter((f) => f.required)

  if (!required.length) return false

  return required.every((f) => {

    const v = values[f.field_key]

    return v !== undefined && v !== null && String(v).trim() !== ""

  })

}



export function PaymentSetupPage({ embedded = false }) {

  const { t } = useTranslation()

  const queryClient = useQueryClient()

  const [bankSectionOpen, setBankSectionOpen] = useState(false)

  const [acceptCod, setAcceptCod] = useState(false)

  const [fields, setFields] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})

  const [synced, setSynced] = useState(false)



  const { data, isLoading } = useQuery({

    queryKey: ["seller", "payout-profile"],

    queryFn: fetchPayoutProfile,

  })



  const profile = data?.profile

  const setup = data?.setup

  const capabilities = data?.capabilities ?? {}

  const fieldDefs = data?.field_definitions ?? []



  useEffect(() => {

    if (!data || synced) return

    setBankSectionOpen(Boolean(data.enable_direct_bank))

    setAcceptCod(Boolean(data.accept_cod))

    setFields(data.field_values ?? {})

    setSynced(true)

  }, [data, synced])



  const saveMutation = useMutation({

    mutationFn: (payload) => savePayoutProfile(payload),

    onSuccess: () => {

      toast.success(t("finance.payoutSaved"))

      setSynced(false)

      queryClient.invalidateQueries({ queryKey: ["seller", "payout-profile"] })

    },

    onError: (err) => {
      const mapped = mapFinanceApiErrors(err, t)
      if (Object.keys(mapped).length) {
        setFieldErrors(mapped)
      }
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },

  })



  const showCodToggle =

    capabilities.cod_available && capabilities.cod_seller_can_toggle !== false

  const directBankAllowed = capabilities.direct_bank_available !== false

  const canActivate = Boolean(setup?.can_activate_listings)

  const payoutStatus = setup?.payout_status ?? profile?.status

  const pendingBankReview = payoutStatus === "pending_review"



  const announcementKey = useMemo(() => {

    if (canActivate) return null

    return setup?.announcement_key ?? "finance.walletOnlySaveHint"

  }, [canActivate, setup?.announcement_key])



  const handleSave = () => {
    let enableDirectBank = false

    if (bankSectionOpen) {
      if (bankFieldsComplete(fieldDefs, fields)) {
        enableDirectBank = true
      } else {
        const hasPartial = fieldDefs.some((f) => {
          const v = fields[f.field_key]
          return v !== undefined && v !== null && String(v).trim() !== ""
        })
        if (hasPartial) {
          toast.error(t("finance.directBankFieldsRequired"))
          return
        }
      }
    }

    if (enableDirectBank && fieldDefs.length) {
      const clientErrors = validateDynamicFormFields(fieldDefs, fields, t)
      if (Object.keys(clientErrors).length) {
        setFieldErrors(clientErrors)
        return
      }
    }

    setFieldErrors({})
    saveMutation.mutate({
      enable_direct_bank: enableDirectBank,
      accept_cod: acceptCod,
      fields,
    })

  }



  if (isLoading) {

    return (

      <div className="flex justify-center p-12">

        <Loader2 className="size-8 animate-spin text-muted-foreground" />

      </div>

    )

  }



  return (

    <div className={embedded ? "space-y-6" : "mx-auto max-w-2xl space-y-6 p-4 md:p-6"}>

      {!embedded ? (
      <div>

        <h1 className="text-2xl font-bold">{t("finance.paymentSetupTitle")}</h1>

        <p className="text-muted-foreground">{t("finance.paymentSetupIntro")}</p>

      </div>
      ) : null}



      {canActivate ? (

        <Card className="border-emerald-500/40 bg-emerald-500/5">

          <CardContent className="flex items-start gap-3 pt-6 text-sm">

            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />

            <p>{t("finance.payoutActive")}</p>

          </CardContent>

        </Card>

      ) : announcementKey ? (

        <Card

          className={cn(

            "border-amber-500/40 bg-amber-500/5",

            setup?.wallet_only_sufficient && payoutStatus !== "pending_review" && payoutStatus !== "rejected"

              ? "border-primary/30 bg-primary/5"

              : null,

          )}

        >

          <CardContent className="pt-6 text-sm">

            {t(announcementKey, setup?.announcement_params)}

          </CardContent>

        </Card>

      ) : null}



      <Card>

        <CardHeader>

          <CardTitle className="flex items-center gap-2 text-base">

            <Wallet className="size-4" />

            {t("finance.walletSectionTitle")}

          </CardTitle>

          <CardDescription>{t("finance.walletSectionDesc")}</CardDescription>

        </CardHeader>

        <CardContent className="flex flex-wrap items-center gap-2">

          <Badge variant="secondary">{t("finance.walletAlwaysOn")}</Badge>

          {!canActivate ? (

            <Badge variant="outline" className="font-normal">

              {t("finance.walletOnlyEnough")}

            </Badge>

          ) : null}

        </CardContent>

      </Card>



      {directBankAllowed ? (

        <Card>

          <CardHeader className="pb-3">

            <div className="flex items-center justify-between gap-2">

              <CardTitle className="flex items-center gap-2 text-base">

                <Landmark className="size-4" />

                {t("finance.directBankSectionTitle")}

              </CardTitle>

              <Badge variant="outline" className="font-normal text-xs">

                {t("finance.optionalSection")}

              </Badge>

            </div>

          </CardHeader>

          <CardContent className="space-y-4">

            <Button

              type="button"

              variant="outline"

              className="w-full justify-between sm:w-auto"

              onClick={() => setBankSectionOpen((open) => !open)}

            >

              {bankSectionOpen ? t("finance.hideBankSection") : t("finance.addBankOptional")}

              {bankSectionOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}

            </Button>

            {pendingBankReview ? (

              <p className="text-sm text-amber-700 dark:text-amber-400">

                {t("finance.directBankPendingReview")}

              </p>

            ) : null}

            {bankSectionOpen ? (

              <DynamicFormRenderer
                fields={fieldDefs}
                values={fields}
                errors={fieldErrors}
                onChange={(key, value) => {
                  setFields((prev) => ({ ...prev, [key]: value }))
                  setFieldErrors((prev) => {
                    if (!prev[key]) return prev
                    const next = { ...prev }
                    delete next[key]
                    return next
                  })
                }}
              />

            ) : (

              <p className="text-sm text-muted-foreground">{t("finance.walletOnlySaveHint")}</p>

            )}

          </CardContent>

        </Card>

      ) : (

        <Card>

          <CardHeader>

            <CardTitle className="flex items-center gap-2 text-base">

              <Landmark className="size-4" />

              {t("finance.directBankSectionTitle")}

            </CardTitle>

          </CardHeader>

          <CardContent>

            <p className="text-sm text-muted-foreground">{t("finance.directBankDisabledByAdmin")}</p>

          </CardContent>

        </Card>

      )}



      <Card>

        <CardHeader className="pb-3">

          <div className="flex items-center justify-between gap-2">

            <CardTitle className="flex items-center gap-2 text-base">

              <Truck className="size-4" />

              {t("finance.codSectionTitle")}

            </CardTitle>

            {showCodToggle ? (

              <Badge variant="outline" className="font-normal text-xs">

                {t("finance.optionalSection")}

              </Badge>

            ) : null}

          </div>

        </CardHeader>

        <CardContent>

          {showCodToggle ? (

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">

              <div className="space-y-0.5">

                <Label htmlFor="accept-cod-toggle" className="font-medium">

                  {t("finance.acceptCodLabel")}

                </Label>

                <p className="text-sm text-muted-foreground">{t("finance.acceptCodDesc")}</p>

              </div>

              <Switch id="accept-cod-toggle" checked={acceptCod} onCheckedChange={setAcceptCod} />

            </div>

          ) : (

            <p className="text-sm text-muted-foreground">{t("finance.codDisabledByAdmin")}</p>

          )}

        </CardContent>

      </Card>



      <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full sm:w-auto" size="lg">

        {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}

        {canActivate ? t("common.save") : t("finance.saveToActivate")}

      </Button>

    </div>

  )

}

