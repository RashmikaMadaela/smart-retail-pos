import type { Customer, CustomerLedger } from "./types";
import { useTranslation } from "react-i18next";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";

type CustomersTabProps = {
  customers: Customer[];
  selectedCustomerId: number | null;
  customerSearchText: string;
  customerPayment: string;
  customerLedger: CustomerLedger | null;
  onRefreshCustomers: () => void;
  onCustomerSearchChange: (value: string) => void;
  onSelectCustomer: (id: number) => void;
  onCustomerPaymentChange: (value: string) => void;
  onApplyCustomerPayment: () => void;
};

export function CustomersTab({
  customers,
  selectedCustomerId,
  customerSearchText,
  customerPayment,
  customerLedger,
  onRefreshCustomers,
  onCustomerSearchChange,
  onSelectCustomer,
  onCustomerPaymentChange,
  onApplyCustomerPayment,
}: CustomersTabProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <ToolbarCard
        title={t("customers.title")}
        description={t("customers.description")}
        actions={
          <>
            <input
              className="w-64 max-w-full"
              placeholder={t("customers.search")}
              value={customerSearchText}
              onChange={(e) => onCustomerSearchChange(e.target.value)}
            />
            <button type="button" onClick={onRefreshCustomers}>
              {t("customers.refresh")}
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_minmax(0,1fr)]">
        <SurfaceCard title={t("customers.listTitle")} className="overflow-hidden" contentClassName="p-0">
          <table className="m-0">
            <thead>
              <tr>
                <th>{t("customers.select")}</th>
                <th>{t("customers.name")}</th>
                <th>{t("customers.contact")}</th>
                <th>{t("customers.outstanding")}</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    {t("customers.empty")}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <input
                        type="radio"
                        checked={selectedCustomerId === customer.id}
                        onChange={() => onSelectCustomer(customer.id)}
                      />
                    </td>
                    <td>{customer.name}</td>
                    <td>{customer.contact || "-"}</td>
                    <td>{Number(customer.total_outstanding).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard title={t("customers.settlement")}>
            <label className="mt-3 block text-sm font-medium text-foreground">
              {t("customers.paymentAmount")}
              <input value={customerPayment} onChange={(e) => onCustomerPaymentChange(e.target.value)} />
            </label>
            <button className="mt-3" type="button" onClick={onApplyCustomerPayment}>
              {t("customers.recordPayment")}
            </button>
          </SurfaceCard>

          <SurfaceCard title={t("customers.ledger")} className="overflow-hidden" contentClassName="p-0">
            <table className="m-0">
              <thead>
                <tr>
                  <th>{t("customers.sale")}</th>
                  <th>{t("customers.total")}</th>
                  <th>{t("customers.paid")}</th>
                  <th>{t("customers.balance")}</th>
                  <th>{t("customers.status")}</th>
                </tr>
              </thead>
              <tbody>
                {(customerLedger?.sales || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      {t("customers.noLedger")}
                    </td>
                  </tr>
                ) : (
                  (customerLedger?.sales || []).map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.id}</td>
                      <td>{Number(sale.total).toFixed(2)}</td>
                      <td>{Number(sale.paid_amount).toFixed(2)}</td>
                      <td>{Number(sale.balance_due).toFixed(2)}</td>
                      <td>{sale.payment_status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SurfaceCard>
        </div>
      </div>
    </section>
  );
}
