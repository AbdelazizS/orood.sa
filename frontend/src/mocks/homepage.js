export const mockCategories = [
  {
    id: 1,
    name: "Food & Grocery",
    icon: "Utensils",
    subcategories: [
      { id: 11, name: "Dates" },
      { id: 12, name: "Spices" },
      { id: 13, name: "Fresh Produce" },
    ],
  },
  {
    id: 2,
    name: "Electronics",
    icon: "Smartphone",
    subcategories: [
      { id: 21, name: "Phones" },
      { id: 22, name: "Laptops" },
      { id: 23, name: "Accessories" },
    ],
  },
]

export const mockRegions = [
  {
    id: 1,
    name: "Riyadh",
    cities: [
      { id: 101, name: "Riyadh City" },
      { id: 102, name: "Diriyah" },
    ],
  },
  {
    id: 2,
    name: "Makkah",
    cities: [
      { id: 201, name: "Jeddah" },
      { id: 202, name: "Makkah City" },
    ],
  },
]

export const mockFeedPage = {
  data: [
    {
      id: 1001,
      type: "offer",
      title: "Premium Saudi Dates (10kg)",
      description: "Fresh Ajwa dates directly from Madinah farmers.",
      price: 950,
      currency: "SAR",
      condition: "new",
      warranty_period: null,
      location: "Madinah",
      is_verified: true,
      stats: {
        views: 320,
        purchases: 48,
        messages: 120,
      },
      seller: {
        name: "Al-Madina Farms",
        last_seen: "Online",
        completed_orders: 540,
        avatar_url: null,
      },
      media: {
        image_url: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=600&q=80",
      },
      tags: ["Free Shipping", "Limited"],
      created_at: "2026-02-10T10:00:00Z",
    },
    {
      id: 1002,
      type: "request",
      title: "Logistics Partner for Riyadh",
      description: "Looking for delivery partner for electronics across Riyadh.",
      budget: "Negotiable",
      condition: "used",
      warranty_period: "30 days",
      location: "Riyadh",
      is_verified: false,
      stats: {
        views: 210,
        purchases: 0,
        messages: 35,
      },
      seller: {
        name: "TechHub Stores",
        last_seen: "2 hours ago",
        completed_orders: 230,
        avatar_url: null,
      },
      media: {
        image_url: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=600&q=80",
      },
      tags: ["Urgent", "B2B"],
      created_at: "2026-02-09T18:30:00Z",
    },
  ],
  meta: {
    current_page: 1,
    has_more: false,
  },
}
