import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"

export function useCreateListing() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => apiClient.post("/products", payload),
    onSuccess: (res) => {
      const id = res?.data?.data?.id ?? res?.data?.id
      toast.success(res?.data?.message ?? "تم نشر الإعلان بنجاح")
      queryClient.invalidateQueries({ queryKey: ["feed"] })
      if (id) {
        navigate(`/products/${id}`, { replace: true })
      } else {
        navigate("/", { replace: true })
      }
    },
    onError: (err) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "حدث خطأ"
      toast.error(msg)
    },
  })
}
