export interface Category {
  name: string;
  emoji: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { name: "Food & Dining", emoji: "🍔", color: "#FF9F0A" },
  { name: "Groceries", emoji: "🛒", color: "#30D158" },
  { name: "Transport", emoji: "🚕", color: "#0A84FF" },
  { name: "Shopping", emoji: "🛍️", color: "#FF375F" },
  { name: "Bills & Utilities", emoji: "🧾", color: "#64D2FF" },
  { name: "Entertainment", emoji: "🎬", color: "#BF5AF2" },
  { name: "Health", emoji: "💊", color: "#FF453A" },
  { name: "Cigarettes", emoji: "🚬", color: "#A2845E" },
  { name: "Sports", emoji: "⚽", color: "#00C7BE" },
  { name: "Rent", emoji: "🏠", color: "#5E5CE6" },
  { name: "Salary", emoji: "💰", color: "#30D158" },
  { name: "Transfer", emoji: "🔁", color: "#8E8E93" },
  { name: "Other", emoji: "✨", color: "#8E8E93" },
];

export function getCategory(name: string | null): Category {
  return CATEGORIES.find((c) => c.name === name) ?? { name: name ?? "Uncategorized", emoji: "❔", color: "#8E8E93" };
}
