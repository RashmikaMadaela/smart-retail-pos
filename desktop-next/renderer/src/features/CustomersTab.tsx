import type { Customer, CustomerLedger } from "./types";
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
  return (
    <section className="space-y-4">
      <ToolbarCard
        title="Customer Ledger"
        description="Track outstanding balances and settle customer dues."
        actions={
          <>
            <input
              className="w-64 max-w-full"
              placeholder="Search customer"
              value={customerSearchText}
              onChange={(e) => onCustomerSearchChange(e.target.value)}
            />
            <button type="button" onClick={onRefreshCustomers}>
              Refresh
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_minmax(0,1fr)]">
        <SurfaceCard title="Customers" className="overflow-hidden" contentClassName="p-0">
          <table className="m-0">
            <thead>
              <tr>
                <th>Select</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No customers found.
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
          <SurfaceCard title="Settlement">
            <label className="mt-3 block text-sm font-medium text-foreground">
              Payment Amount
              <input value={customerPayment} onChange={(e) => onCustomerPaymentChange(e.target.value)} />
            </label>
            <button className="mt-3" type="button" onClick={onApplyCustomerPayment}>
              Record Payment
            </button>
          </SurfaceCard>

          <SurfaceCard title="Ledger" className="overflow-hidden" contentClassName="p-0">
            <table className="m-0">
              <thead>
                <tr>
                  <th>Sale</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(customerLedger?.sales || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No customer ledger entries.
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
