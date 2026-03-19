import type { HeldSale } from "./types";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";

type HeldSalesTabProps = {
  heldSales: HeldSale[];
  selectedHeldId: number | null;
  onRefreshHeldSales: () => void;
  onSelectHeldSale: (id: number) => void;
  onRecallHeldSale: () => void;
  onCompleteHeldSale: () => void;
};

export function HeldSalesTab({
  heldSales,
  selectedHeldId,
  onRefreshHeldSales,
  onSelectHeldSale,
  onRecallHeldSale,
  onCompleteHeldSale,
}: HeldSalesTabProps) {
  return (
    <section className="space-y-4">
      <ToolbarCard
        title="Held Sales"
        description="Resume or complete parked transactions quickly."
        actions={
          <>
            <button type="button" onClick={onRefreshHeldSales}>
              Refresh Held
            </button>
            <button type="button" onClick={onRecallHeldSale}>
              Recall to Cart
            </button>
            <button type="button" onClick={onCompleteHeldSale}>
              Complete Selected
            </button>
          </>
        }
      />

      <SurfaceCard className="overflow-hidden" contentClassName="p-0">
        <table className="m-0">
          <thead>
            <tr>
              <th>Select</th>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Total</th>
              <th>Cashier</th>
            </tr>
          </thead>
          <tbody>
            {heldSales.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No held sales found.
                </td>
              </tr>
            ) : (
              heldSales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <input
                      type="radio"
                      checked={selectedHeldId === sale.id}
                      onChange={() => onSelectHeldSale(sale.id)}
                    />
                  </td>
                  <td>{sale.id}</td>
                  <td>{sale.timestamp}</td>
                  <td>{Number(sale.total).toFixed(2)}</td>
                  <td>{sale.cashier || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SurfaceCard>
    </section>
  );
}
