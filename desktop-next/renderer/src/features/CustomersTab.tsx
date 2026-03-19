import type { Customer, CustomerLedger } from "./types";

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
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/45 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <h2 className="m-0 text-xl font-semibold text-foreground">Customer Ledger</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track outstanding balances and settle customer dues.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-64 max-w-full"
            placeholder="Search customer"
            value={customerSearchText}
            onChange={(e) => onCustomerSearchChange(e.target.value)}
          />
          <button type="button" onClick={onRefreshCustomers}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/45">
          <div className="border-b border-border/80 px-4 py-3">
            <h3 className="m-0 text-lg font-semibold text-foreground">Customers</h3>
          </div>
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
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-background/45 p-4">
            <h3 className="m-0 text-lg font-semibold text-foreground">Settlement</h3>
            <label className="mt-3 block text-sm font-medium text-foreground">
              Payment Amount
              <input value={customerPayment} onChange={(e) => onCustomerPaymentChange(e.target.value)} />
            </label>
            <button className="mt-3" type="button" onClick={onApplyCustomerPayment}>
              Record Payment
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/45">
            <div className="border-b border-border/80 px-4 py-3">
              <h3 className="m-0 text-lg font-semibold text-foreground">Ledger</h3>
            </div>
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
          </div>
        </div>
      </div>
    </section>
  );
}
