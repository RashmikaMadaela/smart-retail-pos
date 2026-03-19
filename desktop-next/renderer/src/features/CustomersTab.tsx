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
    <section className="products-panel">
      <div className="panel-head">
        <h2>Customer Ledger</h2>
        <div className="actions">
          <input
            placeholder="Search customer"
            value={customerSearchText}
            onChange={(e) => onCustomerSearchChange(e.target.value)}
          />
          <button type="button" onClick={onRefreshCustomers}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel-card">
          <h3>Customers</h3>
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-card">
          <h3>Settlement</h3>
          <label>
            Payment Amount
            <input value={customerPayment} onChange={(e) => onCustomerPaymentChange(e.target.value)} />
          </label>
          <button type="button" onClick={onApplyCustomerPayment}>
            Record Payment
          </button>
          <h3>Ledger</h3>
          <table>
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
              {(customerLedger?.sales || []).map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.id}</td>
                  <td>{Number(sale.total).toFixed(2)}</td>
                  <td>{Number(sale.paid_amount).toFixed(2)}</td>
                  <td>{Number(sale.balance_due).toFixed(2)}</td>
                  <td>{sale.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
