import type { HeldSale } from "./types";

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
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/45 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <h2 className="m-0 text-xl font-semibold text-foreground">Held Sales</h2>
          <p className="mt-1 text-sm text-muted-foreground">Resume or complete parked transactions quickly.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRefreshHeldSales}>
            Refresh Held
          </button>
          <button type="button" onClick={onRecallHeldSale}>
            Recall to Cart
          </button>
          <button type="button" onClick={onCompleteHeldSale}>
            Complete Selected
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/45">
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
      </div>
    </section>
  );
}
