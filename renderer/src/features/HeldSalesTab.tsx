import type { HeldSale } from "./types";
import { useTranslation } from "react-i18next";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";

type HeldSalesTabProps = {
  heldSales: HeldSale[];
  selectedHeldId: number | null;
  onRefreshHeldSales: () => void;
  onSelectHeldSale: (id: number) => void;
  onRecallHeldSale: () => void;
  onCompleteHeldSale: () => void;
  onRemoveHeldSale: () => void;
};

export function HeldSalesTab({
  heldSales,
  selectedHeldId,
  onRefreshHeldSales,
  onSelectHeldSale,
  onRecallHeldSale,
  onCompleteHeldSale,
  onRemoveHeldSale,
}: HeldSalesTabProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <ToolbarCard
        title={t("held.title")}
        description={t("held.description")}
        actions={
          <>
            <button type="button" onClick={onRefreshHeldSales}>
              {t("held.refresh")}
            </button>
            <button type="button" onClick={onRecallHeldSale}>
              {t("held.recall")}
            </button>
            <button type="button" onClick={onCompleteHeldSale}>
              {t("held.complete")}
            </button>
            <button type="button" onClick={onRemoveHeldSale} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("held.remove")}
            </button>
          </>
        }
      />

      <SurfaceCard className="overflow-hidden" contentClassName="p-0">
        <table className="m-0">
          <thead>
            <tr>
              <th>{t("held.select")}</th>
              <th>{t("held.id")}</th>
              <th>{t("held.timestamp")}</th>
              <th>{t("held.total")}</th>
              <th>{t("held.cashier")}</th>
            </tr>
          </thead>
          <tbody>
            {heldSales.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  {t("held.empty")}
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
