import type { CardChargeDto } from "../api";
import { ChargeListItem } from "./charge-list-item";

export function ChargeList({ charges }: { charges: CardChargeDto[] }) {
  return (
    <div className="flex flex-col gap-1">
      {charges.map((charge) => (
        <ChargeListItem key={charge.id} charge={charge} />
      ))}
    </div>
  );
}
