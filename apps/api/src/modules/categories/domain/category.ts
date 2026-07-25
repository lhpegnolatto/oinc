export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}
