export interface Investment {
  id: string;
  userId: string;
  name: string;
  quantity: number | null;
  costBasis: number | null;
  currentValue: number;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}
