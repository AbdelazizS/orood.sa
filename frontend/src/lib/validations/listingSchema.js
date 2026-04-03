import { z } from "zod"

export const addListingSchema = z
  .object({
    type: z.enum(["OFFER", "REQUEST"], {
      required_error: "اختر نوع الإعلان",
    }),
    mainCategoryId: z.union([z.number(), z.string()]).optional(),
    subCategoryId: z.union([z.number(), z.string()]).nullable().optional(),
    regionId: z.union([z.number(), z.string()]).optional(),
    cityId: z.union([z.number(), z.string()]).optional(),
    title: z
      .string()
      .min(5, "العنوان يجب أن يكون 5 أحرف على الأقل")
      .max(200, "العنوان لا يتجاوز 200 حرف"),
    description: z
      .string()
      .min(10, "النص يجب أن يكون 10 أحرف على الأقل")
      .max(5000, "النص لا يتجاوز 5000 حرف"),
    imageUrls: z.array(z.string()).optional().default([]),
    price: z
      .number({ invalid_type_error: "أدخل سعراً صحيحاً" })
      .min(0, "السعر يجب أن يكون أكبر من أو يساوي صفر")
      .optional()
      .nullable(),
    taxIncluded: z.boolean().default(false),
    contactPhone: z
      .string()
      .regex(/^05\d{8}$/, "رقم الجوال غير صحيح — مثال: 0555555555")
      .optional()
      .nullable(),
    contactByCall: z.boolean().default(false),
    contactByMessage: z.boolean().default(true),
    freeShipping: z.boolean().default(false),
    freeReturn: z.boolean().default(false),
    freeReturnDays: z.number().min(1).max(30).optional().nullable(),
    viewAtLocation: z.boolean().default(false),
    showComments: z.boolean().default(true),
    biddingEnabled: z.boolean().default(false),
    biddingVisible: z.boolean().default(true),
    noPlatformFee: z.boolean().default(true),
    termsAccepted: z.boolean().refine((v) => v === true, {
      message: "يجب الموافقة على الشروط",
    }),
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
  .refine((d) => d.mainCategoryId != null && d.mainCategoryId !== "", {
    message: "اختر القسم الرئيسي",
    path: ["mainCategoryId"],
  })
  .refine((d) => d.regionId != null && d.regionId !== "", {
    message: "اختر المنطقة",
    path: ["regionId"],
  })
  .refine((d) => d.cityId != null && d.cityId !== "", {
    message: "اختر المدينة",
    path: ["cityId"],
  })
  .refine(
    (d) =>
      d.mainCategoryId == null ||
      d.mainCategoryId === "" ||
      (d.subCategoryId != null && d.subCategoryId !== ""),
    {
      message: "اختر القسم الفرعي",
      path: ["subCategoryId"],
    }
  )
  .refine(
    (d) => d.type !== "OFFER" || (d.imageUrls?.length ?? 0) >= 1,
    {
      message: "يجب رفع صورة واحدة على الأقل للعرض",
      path: ["imageUrls"],
    }
  )
