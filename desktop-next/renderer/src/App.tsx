import { FormEvent, useMemo, useState } from "react";
import { useSessionStore } from "./store/useSessionStore";

type Product = {
  barcode_id: string;
  name: string;
  sell_price: number;
  stock: number;
  default_discount_pct?: number;
};

type Summary = {
  gross_sales: number;
  cogs: number;
  expenses: number;
  net_profit: number;
};

type CartItem = {
  product_id: string;
  name: string;
  qty: number;
  price: number;
  discount: number;
};

type HeldSale = {
  id: number;
  timestamp: string;
  total: number;
  subtotal: number;
  discount: number;
  cashier: string | null;
};

type Customer = {
  id: number;
  name: string;
  contact: string | null;
  total_outstanding: number;
};

type Supplier = {
  id: number;
  name: string;
  contact: string | null;
  total_outstanding: number;
};

type SupplierBatch = {
  id: number;
  reference_no: string | null;
  total_cost: number;
  paid_amount: number;
  balance_due: number;
  status: string;
};

type SupplierPayment = {
  id: number;
  batch_id: number | null;
  amount: number;
  method: string;
  paid_at: string;
};

type CustomerLedger = {
  customer: Customer | null;
  sales: Array<{
    id: number;
    timestamp: string;
    total: number;
    paid_amount: number;
    balance_due: number;
    payment_status: string;
  }>;
};

type SupplierLedger = {
  supplier: Supplier | null;
  batches: SupplierBatch[];
  payments: SupplierPayment[];
};

type BatchLineDraft = {
  product_id: string;
  qty_received: string;
  unit_cost: string;
  line_discount_pct: string;
};

export default function App() {
  const { user, setUser } = useSessionStore();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"billing" | "held" | "customers" | "suppliers">("billing");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [paymentMode, setPaymentMode] = useState<"PAID" | "PARTIAL" | "UNPAID">("PAID");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");

  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [selectedHeldId, setSelectedHeldId] = useState<number | null>(null);

  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerLedger, setCustomerLedger] = useState<CustomerLedger | null>(null);
  const [customerPayment, setCustomerPayment] = useState("");

  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [supplierLedger, setSupplierLedger] = useState<SupplierLedger | null>(null);
  const [batchReference, setBatchReference] = useState("");
  const [batchPaid, setBatchPaid] = useState("");
  const [batchLines, setBatchLines] = useState<BatchLineDraft[]>([]);
  const [batchLineDraft, setBatchLineDraft] = useState<BatchLineDraft>({
    product_id: "",
    qty_received: "",
    unit_cost: "",
    line_discount_pct: "0",
  });
  const [selectedSupplierBatchId, setSelectedSupplierBatchId] = useState<number | null>(null);
  const [supplierPayAmount, setSupplierPayAmount] = useState("");
  const [supplierPayMethod, setSupplierPayMethod] = useState("CASH");
  const [supplierPayNote, setSupplierPayNote] = useState("");

  const netColor = useMemo(() => {
    if (!summary) {
      return "#f5f7fa";
    }
    return summary.net_profit >= 0 ? "#0ea95f" : "#d43636";
  }, [summary]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    const response = await window.posApi.login(username, password);
    if (!response.ok) {
      setError(response.error ?? "Login failed.");
      return;
    }

    setUser(response.data);
    await refreshProducts();
    await refreshSummary();
    await refreshHeldSales(response.data.id);
    await refreshCustomers();
    await refreshSuppliers();
    setSelectedProductId("");
  }

  async function refreshProducts() {
    const response = searchText.trim()
      ? await window.posApi.searchProducts(searchText.trim(), 50)
      : await window.posApi.listProducts(50);
    if (response.ok) {
      setProducts(response.data);
      if (!selectedProductId && response.data.length > 0) {
        setSelectedProductId(response.data[0].barcode_id);
      }
    }
  }

  async function refreshHeldSales(cashierId?: number) {
    const response = await window.posApi.listHeldSales(cashierId);
    if (response.ok) {
      setHeldSales(response.data);
    }
  }

  async function refreshCustomers() {
    const response = await window.posApi.searchCustomers({ search_text: customerSearchText, limit: 100 });
    if (response.ok) {
      setCustomers(response.data);
    }
  }

  async function refreshCustomerLedger(customerId: number) {
    const response = await window.posApi.getCustomerLedger(customerId);
    if (response.ok) {
      setCustomerLedger(response.data);
    }
  }

  async function refreshSuppliers() {
    const response = await window.posApi.listSuppliers({ limit: 100 });
    if (response.ok) {
      setSuppliers(response.data);
    }
  }

  async function refreshSupplierLedger(supplierId: number) {
    const response = await window.posApi.getSupplierLedger(supplierId);
    if (response.ok) {
      setSupplierLedger(response.data);
      const firstOpen = response.data.batches.find((x: SupplierBatch) => Number(x.balance_due) > 0);
      setSelectedSupplierBatchId(firstOpen ? Number(firstOpen.id) : null);
    }
  }

  function pushMessage(text: string) {
    setError("");
    setMessage(text);
  }

  function pushError(text: string) {
    setMessage("");
    setError(text);
  }

  function getSelectedProduct() {
    return products.find((product) => product.barcode_id === selectedProductId) || null;
  }

  function addSelectedProductToCart() {
    const product = getSelectedProduct();
    if (!product) {
      pushError("Select a product first.");
      return;
    }

    const qtyValue = Number(addQty || "0");
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
      pushError("Add quantity must be a positive number.");
      return;
    }

    const defaultDiscount = Number(product.default_discount_pct || 0);
    const unitDiscount = Number((Number(product.sell_price) * (defaultDiscount / 100)).toFixed(2));

    setCart((prev) => {
      const existing = prev.find((row) => row.product_id === product.barcode_id);
      if (!existing) {
        return [
          ...prev,
          {
            product_id: product.barcode_id,
            name: product.name,
            qty: qtyValue,
            price: Number(product.sell_price),
            discount: unitDiscount,
          },
        ];
      }

      return prev.map((row) =>
        row.product_id === product.barcode_id
          ? {
              ...row,
              qty: Number((row.qty + qtyValue).toFixed(2)),
            }
          : row,
      );
    });

    pushMessage(`${product.name} added to cart.`);
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((row) => row.product_id !== productId));
  }

  const subTotal = useMemo(
    () =>
      cart.reduce((acc, item) => {
        const line = Number(item.qty) * Number(item.price);
        return acc + line;
      }, 0),
    [cart],
  );

  const lineDiscountTotal = useMemo(
    () =>
      cart.reduce((acc, item) => {
        const lineDisc = Number(item.qty) * Number(item.discount);
        return acc + lineDisc;
      }, 0),
    [cart],
  );

  const baseTotal = Math.max(0, Number((subTotal - lineDiscountTotal).toFixed(2)));

  const paidValue = useMemo(() => {
    if (paymentMode === "UNPAID") {
      return 0;
    }
    if (!paidAmount.trim()) {
      return paymentMode === "PAID" ? baseTotal : 0;
    }
    const parsed = Number(paidAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [paymentMode, paidAmount, baseTotal]);

  const changeDue = Math.max(0, Number((paidValue - baseTotal).toFixed(2)));
  const balanceDue = Math.max(0, Number((baseTotal - paidValue).toFixed(2)));

  async function processCheckout() {
    if (!user) {
      return;
    }
    if (cart.length === 0) {
      pushError("Cart is empty.");
      return;
    }

    let customerId: number | null = null;
    if (paymentMode !== "PAID") {
      if (!customerName.trim()) {
        pushError("Customer name is required for PARTIAL/UNPAID.");
        return;
      }
      const cRes = await window.posApi.createOrGetCustomer({
        name: customerName.trim(),
        contact: customerContact.trim(),
      });
      if (!cRes.ok) {
        pushError(cRes.error || "Customer lookup failed.");
        return;
      }
      customerId = Number(cRes.data.id);
    }

    const paidPayload = paymentMode === "UNPAID" ? 0 : paidAmount.trim() ? Number(paidAmount) : baseTotal;
    if (Number.isNaN(paidPayload) || paidPayload < 0) {
      pushError("Paid amount must be a non-negative number.");
      return;
    }

    const payload = {
      cashier_id: user.id,
      customer_id: customerId,
      cart_items: cart.map((row) => ({
        product_id: row.product_id,
        qty: row.qty,
        price: row.price,
        discount: row.discount,
      })),
      subtotal: Number(subTotal.toFixed(2)),
      global_discount: Number(lineDiscountTotal.toFixed(2)),
      total_amount: Number(baseTotal.toFixed(2)),
      status: "COMPLETED",
      paid_amount: Number(paidPayload.toFixed(2)),
      payment_status: paymentMode,
      payment_method: paymentMethod,
    };

    const response = await window.posApi.processSale(payload);
    if (!response.ok) {
      pushError(response.error || "Checkout failed.");
      return;
    }

    pushMessage(`Checkout successful. Sale ID: ${response.data.sale_id}`);
    setCart([]);
    setPaidAmount("");
    await refreshProducts();
    await refreshSummary();
    await refreshHeldSales(user.id);
    await refreshCustomers();
  }

  async function holdCurrentBill() {
    if (!user) {
      return;
    }
    if (cart.length === 0) {
      pushError("Cart is empty.");
      return;
    }

    const payload = {
      cashier_id: user.id,
      cart_items: cart.map((row) => ({
        product_id: row.product_id,
        qty: row.qty,
        price: row.price,
        discount: row.discount,
      })),
      subtotal: Number(subTotal.toFixed(2)),
      global_discount: Number(lineDiscountTotal.toFixed(2)),
      total_amount: Number(baseTotal.toFixed(2)),
      payment_method: paymentMethod,
    };

    const response = await window.posApi.holdSale(payload);
    if (!response.ok) {
      pushError(response.error || "Hold failed.");
      return;
    }

    pushMessage(`Bill held successfully. Hold ID: ${response.data.sale_id}`);
    setCart([]);
    await refreshHeldSales(user.id);
  }

  async function recallHeldSaleIntoCart() {
    if (!selectedHeldId) {
      pushError("Select a held sale first.");
      return;
    }
    const response = await window.posApi.recallHeldSale(selectedHeldId);
    if (!response.ok) {
      pushError(response.error || "Recall failed.");
      return;
    }

    const recalled = (response.data.items || []).map((item: any) => ({
      product_id: item.product_id,
      name: item.name || item.product_id,
      qty: Number(item.qty),
      price: Number(item.sold_at_price),
      discount: Number(item.item_discount || 0),
    }));

    setCart(recalled);
    setActiveTab("billing");
    pushMessage(`Held sale ${selectedHeldId} loaded to cart.`);
  }

  async function completeHeldSaleNow() {
    if (!selectedHeldId) {
      pushError("Select a held sale first.");
      return;
    }

    let customerId: number | null = null;
    if (paymentMode !== "PAID") {
      if (!customerName.trim()) {
        pushError("Customer name is required for PARTIAL/UNPAID.");
        return;
      }
      const cRes = await window.posApi.createOrGetCustomer({
        name: customerName.trim(),
        contact: customerContact.trim(),
      });
      if (!cRes.ok) {
        pushError(cRes.error || "Customer lookup failed.");
        return;
      }
      customerId = Number(cRes.data.id);
    }

    const paidPayload = paymentMode === "UNPAID" ? 0 : paidAmount.trim() ? Number(paidAmount) : baseTotal;
    const response = await window.posApi.completeHeldSale({
      sale_id: selectedHeldId,
      customer_id: customerId,
      paid_amount: Number.isNaN(paidPayload) ? 0 : Number(paidPayload.toFixed(2)),
      payment_status: paymentMode,
      cart_items: cart.map((row) => ({
        product_id: row.product_id,
        qty: row.qty,
        price: row.price,
        discount: row.discount,
      })),
      subtotal: Number(subTotal.toFixed(2)),
      global_discount: Number(lineDiscountTotal.toFixed(2)),
      total_amount: Number(baseTotal.toFixed(2)),
      payment_method: paymentMethod,
    });

    if (!response.ok) {
      pushError(response.error || "Complete held sale failed.");
      return;
    }

    pushMessage(`Held sale ${selectedHeldId} completed.`);
    setCart([]);
    setSelectedHeldId(null);
    await refreshHeldSales(user?.id);
    await refreshProducts();
    await refreshSummary();
  }

  async function recordCustomerSettlement() {
    if (!selectedCustomerId) {
      pushError("Select a customer first.");
      return;
    }
    const amount = Number(customerPayment);
    if (!Number.isFinite(amount) || amount <= 0) {
      pushError("Enter a valid customer payment amount.");
      return;
    }

    const response = await window.posApi.recordCustomerPayment({
      customer_id: selectedCustomerId,
      amount,
    });
    if (!response.ok) {
      pushError(response.error || "Customer payment failed.");
      return;
    }

    setCustomerPayment("");
    pushMessage(response.data.message || "Customer payment recorded.");
    await refreshCustomers();
    await refreshCustomerLedger(selectedCustomerId);
    await refreshSummary();
  }

  async function createSupplierNow() {
    if (!supplierName.trim()) {
      pushError("Supplier name is required.");
      return;
    }

    const response = await window.posApi.createSupplier({
      name: supplierName.trim(),
      contact: supplierContact.trim(),
      opening_balance: 0,
      notes: "",
    });
    if (!response.ok) {
      pushError(response.error || "Create supplier failed.");
      return;
    }

    setSupplierName("");
    setSupplierContact("");
    pushMessage(response.data.message || "Supplier created.");
    await refreshSuppliers();
  }

  function addSupplierBatchLine() {
    if (!batchLineDraft.product_id.trim()) {
      pushError("Batch line product id is required.");
      return;
    }
    const qty = Number(batchLineDraft.qty_received);
    const cost = Number(batchLineDraft.unit_cost);
    const disc = Number(batchLineDraft.line_discount_pct || "0");
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(disc) || disc < 0) {
      pushError("Batch line values are invalid.");
      return;
    }

    setBatchLines((prev) => [...prev, { ...batchLineDraft }]);
    setBatchLineDraft({ product_id: "", qty_received: "", unit_cost: "", line_discount_pct: "0" });
    pushMessage("Batch line added.");
  }

  async function receiveSupplierBatchNow() {
    if (!selectedSupplierId) {
      pushError("Select a supplier first.");
      return;
    }
    if (batchLines.length === 0) {
      pushError("Add at least one batch line.");
      return;
    }

    const paid = batchPaid.trim() ? Number(batchPaid) : 0;
    if (!Number.isFinite(paid) || paid < 0) {
      pushError("Initial paid amount is invalid.");
      return;
    }

    const response = await window.posApi.receiveSupplierBatch({
      supplier_id: selectedSupplierId,
      reference_no: batchReference.trim(),
      paid_amount: paid,
      items: batchLines.map((line) => ({
        product_id: line.product_id.trim(),
        qty_received: Number(line.qty_received),
        unit_cost: Number(line.unit_cost),
        line_discount_pct: Number(line.line_discount_pct || "0"),
      })),
    });

    if (!response.ok) {
      pushError(response.error || "Receive batch failed.");
      return;
    }

    setBatchReference("");
    setBatchPaid("");
    setBatchLines([]);
    pushMessage(`Batch received. Batch ID: ${response.data.batch_id}`);
    await refreshSuppliers();
    await refreshSupplierLedger(selectedSupplierId);
    await refreshProducts();
  }

  async function recordSupplierSettlement() {
    if (!selectedSupplierId || !selectedSupplierBatchId) {
      pushError("Select supplier and batch first.");
      return;
    }
    const amount = Number(supplierPayAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      pushError("Supplier payment amount is invalid.");
      return;
    }

    const response = await window.posApi.recordSupplierPayment({
      supplier_id: selectedSupplierId,
      batch_id: selectedSupplierBatchId,
      amount,
      method: supplierPayMethod,
      note: supplierPayNote,
    });
    if (!response.ok) {
      pushError(response.error || "Supplier payment failed.");
      return;
    }

    setSupplierPayAmount("");
    setSupplierPayNote("");
    pushMessage(response.data.message || "Supplier payment recorded.");
    await refreshSuppliers();
    await refreshSupplierLedger(selectedSupplierId);
  }

  async function refreshSummary() {
    const response = await window.posApi.getSummary();
    if (response.ok) {
      setSummary(response.data);
    }
  }

  if (!user) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <h1>Smart Retail POS Next</h1>
          <p className="muted">Electron + React migration shell</p>
          <form onSubmit={handleLogin}>
            <label>
              Username
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit">Login</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header>
        <div>
          <h1>Smart Retail POS Next</h1>
          <p>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </p>
        </div>
        <button
          onClick={() => {
            setUser(null);
            setProducts([]);
            setSummary(null);
          }}
        >
          Logout
        </button>
      </header>

      {message ? <p className="notice success">{message}</p> : null}
      {error ? <p className="notice error">{error}</p> : null}

      <section className="tab-switch">
        <button className={activeTab === "billing" ? "active" : ""} onClick={() => setActiveTab("billing")}>Billing</button>
        <button className={activeTab === "held" ? "active" : ""} onClick={() => setActiveTab("held")}>Held Sales</button>
        <button className={activeTab === "customers" ? "active" : ""} onClick={() => setActiveTab("customers")}>Customers</button>
        <button className={activeTab === "suppliers" ? "active" : ""} onClick={() => setActiveTab("suppliers")}>Suppliers</button>
      </section>

      <section className="summary-grid">
        <article>
          <h3>Gross Sales</h3>
          <p>Rs. {summary ? summary.gross_sales.toFixed(2) : "0.00"}</p>
        </article>
        <article>
          <h3>COGS</h3>
          <p>Rs. {summary ? summary.cogs.toFixed(2) : "0.00"}</p>
        </article>
        <article>
          <h3>Expenses</h3>
          <p>Rs. {summary ? summary.expenses.toFixed(2) : "0.00"}</p>
        </article>
        <article>
          <h3>Net Profit</h3>
          <p style={{ color: netColor }}>Rs. {summary ? summary.net_profit.toFixed(2) : "0.00"}</p>
        </article>
      </section>

      {activeTab === "billing" ? (
        <section className="products-panel">
          <div className="panel-head">
            <h2>Billing Workflow</h2>
            <div className="actions">
              <input
                placeholder="Search products"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <button onClick={() => void refreshProducts()}>Refresh Products</button>
              <button onClick={() => void refreshSummary()}>Refresh KPI</button>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel-card">
              <h3>Add Item</h3>
              <label>
                Product
                <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
                  {products.map((product) => (
                    <option key={product.barcode_id} value={product.barcode_id}>
                      {product.barcode_id} | {product.name} | Rs. {Number(product.sell_price).toFixed(2)} | Stock {Number(product.stock).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Qty
                <input value={addQty} onChange={(event) => setAddQty(event.target.value)} />
              </label>
              <button onClick={addSelectedProductToCart}>Add to Cart</button>
            </div>

            <div className="panel-card">
              <h3>Checkout</h3>
              <label>
                Payment Mode
                <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as any)}>
                  <option value="PAID">PAID</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="UNPAID">UNPAID</option>
                </select>
              </label>
              <label>
                Payment Method
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as any)}>
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                </select>
              </label>
              <label>
                Paid Amount
                <input value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} placeholder={paymentMode === "PAID" ? "Blank = full amount" : "Required"} />
              </label>
              <label>
                Customer Name (credit only)
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
              </label>
              <label>
                Customer Contact
                <input value={customerContact} onChange={(event) => setCustomerContact(event.target.value)} />
              </label>
              <div className="calc-grid">
                <p>Subtotal: Rs. {subTotal.toFixed(2)}</p>
                <p>Line Discount: Rs. {lineDiscountTotal.toFixed(2)}</p>
                <p>Total: Rs. {baseTotal.toFixed(2)}</p>
                <p>Change: Rs. {changeDue.toFixed(2)}</p>
                <p>Balance Due: Rs. {balanceDue.toFixed(2)}</p>
              </div>
              <div className="actions">
                <button onClick={holdCurrentBill}>Hold Bill</button>
                <button onClick={processCheckout}>Checkout</button>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Disc</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.product_id}>
                  <td>{item.product_id}</td>
                  <td>{item.name}</td>
                  <td>{item.qty.toFixed(2)}</td>
                  <td>{item.price.toFixed(2)}</td>
                  <td>{item.discount.toFixed(2)}</td>
                  <td>{(item.qty * Math.max(0, item.price - item.discount)).toFixed(2)}</td>
                  <td>
                    <button className="danger" onClick={() => removeFromCart(item.product_id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {activeTab === "held" ? (
        <section className="products-panel">
          <div className="panel-head">
            <h2>Held Sales</h2>
            <div className="actions">
              <button onClick={() => void refreshHeldSales(user.id)}>Refresh Held</button>
              <button onClick={recallHeldSaleIntoCart}>Recall to Cart</button>
              <button onClick={completeHeldSaleNow}>Complete Selected</button>
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
                      onChange={() => setSelectedHeldId(sale.id)}
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
      ) : null}

      {activeTab === "customers" ? (
        <section className="products-panel">
          <div className="panel-head">
            <h2>Customer Ledger</h2>
            <div className="actions">
              <input
                placeholder="Search customer"
                value={customerSearchText}
                onChange={(event) => setCustomerSearchText(event.target.value)}
              />
              <button onClick={() => void refreshCustomers()}>Refresh</button>
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
                          onChange={() => {
                            setSelectedCustomerId(customer.id);
                            void refreshCustomerLedger(customer.id);
                          }}
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
                <input value={customerPayment} onChange={(event) => setCustomerPayment(event.target.value)} />
              </label>
              <button onClick={recordCustomerSettlement}>Record Payment</button>
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
      ) : null}

      {activeTab === "suppliers" ? (
        <section className="products-panel">
          <div className="panel-head">
            <h2>Supplier Ledger</h2>
            <div className="actions">
              <button onClick={() => void refreshSuppliers()}>Refresh Suppliers</button>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel-card">
              <h3>Create Supplier</h3>
              <label>
                Name
                <input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
              </label>
              <label>
                Contact
                <input value={supplierContact} onChange={(event) => setSupplierContact(event.target.value)} />
              </label>
              <button onClick={createSupplierNow}>Create Supplier</button>

              <h3>Suppliers</h3>
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
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <input
                          type="radio"
                          checked={selectedSupplierId === supplier.id}
                          onChange={() => {
                            setSelectedSupplierId(supplier.id);
                            void refreshSupplierLedger(supplier.id);
                          }}
                        />
                      </td>
                      <td>{supplier.name}</td>
                      <td>{supplier.contact || "-"}</td>
                      <td>{Number(supplier.total_outstanding).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel-card">
              <h3>Receive Batch</h3>
              <label>
                Reference No
                <input value={batchReference} onChange={(event) => setBatchReference(event.target.value)} />
              </label>
              <label>
                Initial Paid
                <input value={batchPaid} onChange={(event) => setBatchPaid(event.target.value)} />
              </label>
              <div className="batch-line">
                <input
                  placeholder="Product ID"
                  value={batchLineDraft.product_id}
                  onChange={(event) => setBatchLineDraft((prev) => ({ ...prev, product_id: event.target.value }))}
                />
                <input
                  placeholder="Qty"
                  value={batchLineDraft.qty_received}
                  onChange={(event) => setBatchLineDraft((prev) => ({ ...prev, qty_received: event.target.value }))}
                />
                <input
                  placeholder="Unit Cost"
                  value={batchLineDraft.unit_cost}
                  onChange={(event) => setBatchLineDraft((prev) => ({ ...prev, unit_cost: event.target.value }))}
                />
                <input
                  placeholder="Disc %"
                  value={batchLineDraft.line_discount_pct}
                  onChange={(event) => setBatchLineDraft((prev) => ({ ...prev, line_discount_pct: event.target.value }))}
                />
              </div>
              <div className="actions">
                <button onClick={addSupplierBatchLine}>Add Line</button>
                <button onClick={receiveSupplierBatchNow}>Receive Stock</button>
              </div>

              <h4>Batch Lines</h4>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Cost</th>
                    <th>Disc%</th>
                  </tr>
                </thead>
                <tbody>
                  {batchLines.map((line, index) => (
                    <tr key={`${line.product_id}-${index}`}>
                      <td>{line.product_id}</td>
                      <td>{line.qty_received}</td>
                      <td>{line.unit_cost}</td>
                      <td>{line.line_discount_pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>Settle Batch</h3>
              <label>
                Pay Amount
                <input value={supplierPayAmount} onChange={(event) => setSupplierPayAmount(event.target.value)} />
              </label>
              <label>
                Method
                <select value={supplierPayMethod} onChange={(event) => setSupplierPayMethod(event.target.value)}>
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="BANK">BANK</option>
                </select>
              </label>
              <label>
                Note
                <input value={supplierPayNote} onChange={(event) => setSupplierPayNote(event.target.value)} />
              </label>
              <button onClick={recordSupplierSettlement}>Record Supplier Payment</button>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel-card">
              <h3>Supplier Batches</h3>
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>ID</th>
                    <th>Ref</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(supplierLedger?.batches || []).map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <input
                          type="radio"
                          checked={selectedSupplierBatchId === Number(batch.id)}
                          onChange={() => setSelectedSupplierBatchId(Number(batch.id))}
                        />
                      </td>
                      <td>{batch.id}</td>
                      <td>{batch.reference_no || "-"}</td>
                      <td>{Number(batch.total_cost).toFixed(2)}</td>
                      <td>{Number(batch.paid_amount).toFixed(2)}</td>
                      <td>{Number(batch.balance_due).toFixed(2)}</td>
                      <td>{batch.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel-card">
              <h3>Supplier Payments</h3>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Batch</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {(supplierLedger?.payments || []).map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.id}</td>
                      <td>{payment.batch_id || "-"}</td>
                      <td>{Number(payment.amount).toFixed(2)}</td>
                      <td>{payment.method}</td>
                      <td>{payment.paid_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
