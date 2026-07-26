export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  balance: number;
  color: string;
  icon: string;
  statementCloseDay: number;
  dueDay: number;
  createdAt: Date;
  updatedAt: Date;
}
