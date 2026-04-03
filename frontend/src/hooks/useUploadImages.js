import { useState, useCallback } from "react"
import apiClient from "@/lib/apiClient"

export function useUploadImages() {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const upload = useCallback(async (files) => {
    if (!files?.length) return []
    setIsUploading(true)
    setProgress(0)
    const urls = []
    const total = files.length
    try {
      for (let i = 0; i < total; i++) {
        const formData = new FormData()
        formData.append("image", files[i])
        const { data } = await apiClient.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        const url = data?.url ?? data?.data?.url ?? data
        if (url) urls.push(url)
        setProgress(Math.round(((i + 1) / total) * 100))
      }
      return urls
    } finally {
      setIsUploading(false)
      setProgress(100)
    }
  }, [])

  return { upload, progress, isUploading }
}
