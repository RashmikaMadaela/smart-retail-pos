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
    <section className="products-panel">
      <div className="panel-head">
        <h2>Held Sales</h2>
        <div className="actions">
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

      <table>
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
          {heldSales.map((sale) => (
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
          ))}
        </tbody>
      </table>
    </section>
  );
}
