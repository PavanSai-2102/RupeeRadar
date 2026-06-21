export const CATEGORY_COLORS: Record<string, { bg: string, text: string, border: string, fill: string }> = {
  "Food & Dining": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", fill: "#F97316" },
  "Shopping": { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", fill: "#EC4899" },
  "Travel": { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", fill: "#06B6D4" },
  "Bills & Utilities": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", fill: "#3B82F6" },
  "Salary & Income": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", fill: "#10B981" },
  "Investment": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", fill: "#059669" },
  "Health": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", fill: "#EF4444" },
  "Entertainment": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", fill: "#8B5CF6" },
  "Other": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", fill: "#6B7280" }
};

export const getCategoryColor = (category: string) => {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["Other"];
};
