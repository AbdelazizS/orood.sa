import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { Search, Trash2 } from "lucide-react"

export function SavedSearchesPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: async () => {
      const { data } = await apiClient.get("/saved-searches")
      return data ?? {}
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/saved-searches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-searches"] }),
  })

  const searches = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Saved Searches</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Saved Searches</h1>
      <div className="space-y-4">
        {searches.map((search) => (
          <Card key={search.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Search className="size-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{search.name || search.query}</p>
                  <p className="text-sm text-muted-foreground">{search.query}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(search.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {searches.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No saved searches. Save a search from the homepage to see it here.
        </p>
      )}
    </div>
  )
}
