export interface Transaction {
  id: string;
  walletId: string;
  categoryId: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}
