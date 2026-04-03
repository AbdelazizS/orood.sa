import { z } from "zod"

export const addListingSchema = z
  .object({
    type: z.enum(["OFFER", "REQUEST"], {
      required_error: "اختر نوع الإعلان",
    }),
    mainCategoryId: z.string().min(1, "اختر القسم الرئيسي"),
    subCategoryId: z.string().min(1, "اختر القسم الفرعي"),
    regionId: z.string().min(1, "اختر المنطقة"),
    cityId: z.string().min(1, "اختر المدينة"),
    title: z
      .string()
      .min(5, "العنوان يجب أن يكون 5 أحرف على الأقل")
      .max(200, "العنوان لا يتجاوز 200 حرف"),
    description: z
      .string()
      .min(10, "النص يجب أن يكون 10 أحرف على الأقل")
      .max(5000, "النص لا يتجاوز 5000 حرف"),
    price: z
      .number({ invalid_type_error: "أدخل سعراً صحيحاً" })
      .positive("السعر يجب أن يكون أكبر من صفر")
      .optional()
      .nullable(),
    taxIncluded: z.boolean().default(false),
    contactPhone: z
      .string()
      .optional()
      .refine(
        (v) => !v || v === "" || /^05\d{8}$/.test(v),
        "رقم الجوال غير صحيح — مثال: 0555555555"
      ),
    contactByCall: z.boolean().default(false),
    contactByMessage: z.boolean().default(true),
    freeShipping: z.boolean().default(false),
    freeReturnSameDay: z.boolean().default(false),
    freeReturnDays: z.number().min(1).max(30).optional().nullable(),
    viewAtLocation: z.boolean().default(false),
    showComments: z.boolean().default(true),
    biddingEnabled: z.boolean().default(false),
    biddingVisible: z.boolean().default(true),
    noPlatformFee: z.boolean().default(true),
  })
  .refine(
    (d) => d.contactByCall || d.contactByMessage,
    {
      message: "يجب اختيار طريقة تواصل واحدة على الأقل",
      path: ["contactByMessage"],
    }
  )
  .refine(
    (d) => !d.contactByCall || !!d.contactPhone,
    {
      message: "أدخل رقم الجوال للتواصل عبر المكالمة",
      path: ["contactPhone"],
    }
  )
