import { useState } from "react"
import { useTranslation } from "react-i18next"
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
import { ShieldCheck, Upload, FileText, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export function VerificationPage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuthStore()
  const { direction } = useAppDirection()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("absher")

  // For Civil ID Form
  const [civilIdForm, setCivilIdForm] = useState({
    idNumber: "",
    frontImage: null,
    backImage: null
  })

  // Mock Absher Connection
  const handleAbsherVerification = async () => {
    setIsSubmitting(true)
    setTimeout(() => {
      toast.success("تم توجيهك إلى منصة أبشر بنجاح. (محاكاة)")
      setIsSubmitting(false)
    }, 1500)
  }

  // Handle Civil ID Submit
  const handleCivilIdSubmit = async (e) => {
    e.preventDefault()
    if (!civilIdForm.idNumber || !civilIdForm.frontImage || !civilIdForm.backImage) {
      toast.error("يرجى إكمال جميع الحقول وإرفاق صور البطاقة.")
      return
    }

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append("type", "civil_id")
    formData.append("id_number", civilIdForm.idNumber)
    formData.append("front_image", civilIdForm.frontImage)
    formData.append("back_image", civilIdForm.backImage)

    try {
      // Assuming a generic verification request endpoint
      const res = await apiClient.post("/user/verification-request", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      toast.success("تم إرسال طلب التوثيق بنجاح، سيتم المراجعة من قبل الإدارة.")
      refreshUser()
    } catch (err) {
      toast.error("حدث خطأ أثناء رفع الطلب.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e, field) => {
    if (e.target.files && e.target.files[0]) {
      setCivilIdForm({ ...civilIdForm, [field]: e.target.files[0] })
    }
  }

  if (user?.is_verified) {
    return (
      <div className="container max-w-3xl py-8 space-y-6" dir={direction}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("dashboard.verification", "توثيق الحساب")}
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة حالة توثيق حسابك في منصة عروض.
          </p>
        </div>
        
        <Card className="border-green-500/20 bg-green-500/5 shadow-sm">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-700">حسابك موثق بنجاح</h2>
              <p className="text-sm text-green-600/80 mt-1 max-w-sm mx-auto">
                أنت الآن تستمتع بكافة الصلاحيات المتاحة للحسابات الموثقة. يظهر شعار التوثيق في ملفك الشخصي لزيادة موثوقيتك.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-6 space-y-8" dir={direction}>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("dashboard.verification", "توثيق الحساب")}
          </h1>
        </div>
        <p className="text-muted-foreground">
          وثق حسابك الآن لزيادة ثقة المشتريين والبائعين وإلغاء القيود على ميزات الحساب.
        </p>
      </div>

      <div className="bg-muted/30 p-6 rounded-2xl border border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-background border border-border h-14 p-1 rounded-xl">
            <TabsTrigger value="absher" className="rounded-lg text-base h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              عبر منصة أبشر
            </TabsTrigger>
            <TabsTrigger value="civil" className="rounded-lg text-base h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              عبر البطاقة المدنية
            </TabsTrigger>
          </TabsList>

          <TabsContent value="absher">
            <Card className="border-border shadow-sm">
              <CardHeader className="text-center sm:text-start rtl:sm:text-end pb-4">
                <CardTitle className="text-xl">توثيق سريع وآمن</CardTitle>
                <CardDescription className="text-base mt-2">
                  اربط حسابك مباشرة بمنصة النفاذ الوطني (أبشر) لتوثيق فوري بدون انتظار مراجعة.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-8">
                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 mb-6 flex items-center justify-center shadow-lg">
                  <ShieldCheck size={48} className="text-white" />
                </div>
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto px-12 h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-xl hover:shadow-emerald-600/20 transition-all hover:-translate-y-1"
                  onClick={handleAbsherVerification}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "جاري التوجيه..." : "انتقل إلى النفاذ الوطني"}
                </Button>
              </CardContent>
              <CardFooter className="bg-muted/50 justify-center text-xs text-muted-foreground py-4 border-t border-border">
                هذه الخدمة تضمن خصوصية بياناتك باستخدام بروتوكولات آمنة.
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="civil">
            <Card className="border-border shadow-sm">
              <form onSubmit={handleCivilIdSubmit}>
                <CardHeader className="text-center sm:text-start rtl:sm:text-end pb-4">
                  <CardTitle className="text-xl">رفع البطاقة المدنية (الهوية)</CardTitle>
                  <CardDescription className="text-base mt-2">
                    يرجى إرفاق صور واضحة لبطاقة الهوية الوطنية أو الإقامة. تستغرق المراجعة عادة بين ٢٤ إلى ٤٨ ساعة.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="space-y-2">
                    <Label htmlFor="idNumber" className="text-base font-semibold">رقم الهوية / الإقامة</Label>
                    <Input 
                      id="idNumber" 
                      placeholder="أدخل رقم الهوية المكون من ١٠ أرقام" 
                      className="h-12 text-lg text-start rtl:text-end"
                      value={civilIdForm.idNumber}
                      onChange={(e) => setCivilIdForm({...civilIdForm, idNumber: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 relative">
                      <Label className="text-base font-semibold block">صورة الواجهة الأمامية</Label>
                      <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative h-40">
                        {civilIdForm.frontImage ? (
                          <div className="font-medium text-primary flex items-center gap-2">
                            <CheckCircle2 size={18} /> {civilIdForm.frontImage.name}
                          </div>
                        ) : (
                          <>
                            <Upload size={28} className="text-muted-foreground mb-3" />
                            <span className="text-sm text-foreground font-medium">اضغط لرفع الصورة</span>
                            <span className="text-xs text-muted-foreground mt-1">PNG, JPG حتى 5MB</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleFileChange(e, 'frontImage')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 relative">
                      <Label className="text-base font-semibold block">صورة الواجهة الخلفية</Label>
                      <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative h-40">
                         {civilIdForm.backImage ? (
                          <div className="font-medium text-primary flex items-center gap-2">
                            <CheckCircle2 size={18} /> {civilIdForm.backImage.name}
                          </div>
                        ) : (
                          <>
                            <Upload size={28} className="text-muted-foreground mb-3" />
                            <span className="text-sm text-foreground font-medium">اضغط لرفع الصورة</span>
                            <span className="text-xs text-muted-foreground mt-1">PNG, JPG حتى 5MB</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleFileChange(e, 'backImage')}
                        />
                      </div>
                    </div>
                  </div>

                </CardContent>
                <CardFooter className="pt-4 border-t border-border flex justify-end gap-3 rtl:flex-row-reverse bg-muted/20">
                  <Button type="button" variant="outline" className="h-12 px-6">إلغاء</Button>
                  <Button type="submit" disabled={isSubmitting} className="h-12 px-8 font-bold gap-2">
                    {isSubmitting ? "جاري الإرسال..." : "إرسال طلب التوثيق"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
