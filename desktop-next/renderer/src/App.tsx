import { FormEvent, useMemo, useState } from "react";
import { BillingTab } from "./features/BillingTab";
import { CustomersTab } from "./features/CustomersTab";
import { HeldSalesTab } from "./features/HeldSalesTab";
import { LoginView } from "./features/LoginView";
import { SummaryStrip } from "./features/SummaryStrip";
import { SuppliersTab } from "./features/SuppliersTab";
import type { ActiveTab, BatchLineDraft, CartItem, Customer, CustomerLedger, HeldSale, Product, Summary, Supplier, SupplierBatch, SupplierLedger } from "./features/types";
import { posApiClient } from "./lib/posApiClient";
import { useSessionStore } from "./store/useSessionStore";

export default function App() {
  const { user, setUser } = useSessionStore();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("billing");

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

    const response = await posApiClient.login(username, password);
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
      ? await posApiClient.searchProducts(searchText.trim(), 50)
      : await posApiClient.listProducts(50);
    if (response.ok) {
      setProducts(response.data);
      if (!selectedProductId && response.data.length > 0) {
        setSelectedProductId(response.data[0].barcode_id);
      }
    }
  }

  async function refreshHeldSales(cashierId?: number) {
    const response = await posApiClient.listHeldSales(cashierId);
    if (response.ok) {
      setHeldSales(response.data);
    }
  }

  async function refreshCustomers() {
    const response = await posApiClient.searchCustomers({ search_text: customerSearchText, limit: 100 });
    if (response.ok) {
      setCustomers(response.data);
    }
  }

  async function refreshCustomerLedger(customerId: number) {
    const response = await posApiClient.getCustomerLedger(customerId);
    if (response.ok) {
      setCustomerLedger(response.data);
    }
  }

  async function refreshSuppliers() {
    const response = await posApiClient.listSuppliers({ limit: 100 });
    if (response.ok) {
      setSuppliers(response.data);
    }
  }

  async function refreshSupplierLedger(supplierId: number) {
    const response = await posApiClient.getSupplierLedger(supplierId);
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
      const cRes = await posApiClient.createOrGetCustomer({
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

    const response = await posApiClient.processSale(payload);
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

    const response = await posApiClient.holdSale(payload);
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
    const response = await posApiClient.recallHeldSale(selectedHeldId);
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
      const cRes = await posApiClient.createOrGetCustomer({
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
    const response = await posApiClient.completeHeldSale({
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

    const response = await posApiClient.recordCustomerPayment({
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

    const response = await posApiClient.createSupplier({
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

    const response = await posApiClient.receiveSupplierBatch({
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

    const response = await posApiClient.recordSupplierPayment({
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
    const response = await posApiClient.getSummary();
    if (response.ok) {
      setSummary(response.data);
    }
  }

  if (!user) {
    return (
      <LoginView
        username={username}
        password={password}
        error={error}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
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

      <SummaryStrip summary={summary} netColor={netColor} />

      {activeTab === "billing" ? (
        <>
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
          <BillingTab
            products={products}
            selectedProductId={selectedProductId}
            addQty={addQty}
            cart={cart}
            paymentMode={paymentMode}
            paymentMethod={paymentMethod}
            paidAmount={paidAmount}
            customerName={customerName}
            customerContact={customerContact}
            subTotal={subTotal}
            lineDiscountTotal={lineDiscountTotal}
            baseTotal={baseTotal}
            changeDue={changeDue}
            balanceDue={balanceDue}
            onSelectedProductChange={setSelectedProductId}
            onAddQtyChange={setAddQty}
            onAddToCart={addSelectedProductToCart}
            onRemoveFromCart={removeFromCart}
            onPaymentModeChange={setPaymentMode}
            onPaymentMethodChange={setPaymentMethod}
            onPaidAmountChange={setPaidAmount}
            onCustomerNameChange={setCustomerName}
            onCustomerContactChange={setCustomerContact}
            onHoldSale={holdCurrentBill}
            onProcessSale={processCheckout}
          />
        </>
      ) : null}

      {activeTab === "held" ? (
        <HeldSalesTab
          heldSales={heldSales}
          selectedHeldId={selectedHeldId}
          onRefreshHeldSales={() => void refreshHeldSales(user.id)}
          onSelectHeldSale={setSelectedHeldId}
          onRecallHeldSale={recallHeldSaleIntoCart}
          onCompleteHeldSale={completeHeldSaleNow}
        />
      ) : null}

      {activeTab === "customers" ? (
        <CustomersTab
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          customerSearchText={customerSearchText}
          customerPayment={customerPayment}
          customerLedger={customerLedger}
          onRefreshCustomers={() => void refreshCustomers()}
          onCustomerSearchChange={setCustomerSearchText}
          onSelectCustomer={(id) => {
            setSelectedCustomerId(id);
            void refreshCustomerLedger(id);
          }}
          onCustomerPaymentChange={setCustomerPayment}
          onApplyCustomerPayment={recordCustomerSettlement}
        />
      ) : null}

      {activeTab === "suppliers" ? (
        <SuppliersTab
          supplierName={supplierName}
          supplierContact={supplierContact}
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          batchReference={batchReference}
          batchPaid={batchPaid}
          batchLineDraft={batchLineDraft}
          batchLines={batchLines}
          selectedSupplierBatchId={selectedSupplierBatchId}
          supplierPayAmount={supplierPayAmount}
          supplierPayMethod={supplierPayMethod}
          supplierPayNote={supplierPayNote}
          supplierLedger={supplierLedger}
          onRefreshSuppliers={() => void refreshSuppliers()}
          onSupplierNameChange={setSupplierName}
          onSupplierContactChange={setSupplierContact}
          onCreateSupplier={createSupplierNow}
          onSelectSupplier={(supplierId) => {
            setSelectedSupplierId(supplierId);
            void refreshSupplierLedger(supplierId);
          }}
          onBatchReferenceChange={setBatchReference}
          onBatchPaidChange={setBatchPaid}
          onBatchLineDraftChange={setBatchLineDraft}
          onAddBatchLine={addSupplierBatchLine}
          onReceiveSupplierBatch={receiveSupplierBatchNow}
          onSelectSupplierBatch={setSelectedSupplierBatchId}
          onSupplierPayAmountChange={setSupplierPayAmount}
          onSupplierPayMethodChange={setSupplierPayMethod}
          onSupplierPayNoteChange={setSupplierPayNote}
          onApplySupplierPayment={recordSupplierSettlement}
        />
      ) : null}
    </main>
  );
}
