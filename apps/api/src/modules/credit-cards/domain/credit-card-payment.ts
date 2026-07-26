export interface CreditCardPayment {
  id: string;
  userId: string;
  cardId: string;
  walletId: string;
  amount: number;
  date: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}
