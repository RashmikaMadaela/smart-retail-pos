import { FormEvent, useMemo, useState } from "react";
import { HandCoins, LayoutDashboard, LogOut, PauseCircle, RefreshCw, Truck } from "lucide-react";
import { BillingTab } from "./features/BillingTab";
import { CustomersTab } from "./features/CustomersTab";
import { HeldSalesTab } from "./features/HeldSalesTab";
import { LoginView } from "./features/LoginView";
import { SummaryStrip } from "./features/SummaryStrip";
import { SuppliersTab } from "./features/SuppliersTab";
import type { ActiveTab, BatchLineDraft, CartItem, Customer, CustomerLedger, HeldSale, Product, Summary, Supplier, SupplierBatch, SupplierLedger } from "./features/types";
import { cn } from "./lib/utils";
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

  const tabItems: Array<{
    id: ActiveTab;
    label: string;
    description: string;
    icon: typeof LayoutDashboard;
  }> = [
    {
      id: "billing",
      label: "Billing",
      description: "Fast POS checkout",
      icon: LayoutDashboard,
    },
    {
      id: "held",
      label: "Held Sales",
      description: "Pending sale drafts",
      icon: PauseCircle,
    },
    {
      id: "customers",
      label: "Customers",
      description: "Credit and settlements",
      icon: HandCoins,
    },
    {
      id: "suppliers",
      label: "Suppliers",
      description: "Stock and payables",
      icon: Truck,
    },
  ];

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
    <main className="app-shell px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-border/80 bg-card/80 p-4 shadow-panel backdrop-blur">
          <div className="space-y-1 border-b border-border/80 pb-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Smart Retail</p>
            <h1 className="text-2xl font-semibold">POS Next</h1>
            <p className="text-sm text-muted-foreground">Store Control Center</p>
          </div>

          <div className="mt-4 rounded-xl border border-border/80 bg-background/40 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Session</p>
            <p className="mt-1 font-semibold text-foreground">{user.username}</p>
            <p className="text-muted-foreground">Role: {user.role}</p>
          </div>

          <nav className="mt-4 space-y-2" aria-label="Primary navigation">
            {tabItems.map((item) => {
              const Icon = item.icon;
              const selected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-accent/70 bg-accent/20 text-foreground"
                      : "border-border/80 bg-background/35 text-muted-foreground hover:border-accent/45 hover:text-foreground",
                  )}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon size={16} aria-hidden="true" />
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs">{item.description}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-4">
          <header className="rounded-3xl border border-border/80 bg-card/80 p-4 shadow-panel backdrop-blur md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Operations</p>
                <h2 className="mt-1 text-2xl font-semibold">Smart Retail POS Next</h2>
                <p className="mt-1 text-sm text-muted-foreground">Billing, credits, held sales, and supplier ledgers from one workspace.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/45 px-3 py-2 text-sm font-semibold text-foreground hover:border-accent/60"
                  onClick={() => void refreshSummary()}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Refresh KPI
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-destructive/70 bg-destructive/20 px-3 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/30"
                  onClick={() => {
                    setUser(null);
                    setProducts([]);
                    setSummary(null);
                  }}
                >
                  <LogOut size={16} aria-hidden="true" />
                  Logout
                </button>
              </div>
            </div>

            {message ? <p className="mt-4 rounded-xl border border-emerald-500/45 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
            {error ? <p className="mt-2 rounded-xl border border-rose-500/45 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
          </header>

          <SummaryStrip summary={summary} netColor={netColor} />

          <section className="rounded-3xl border border-border/80 bg-card/65 p-4 shadow-panel backdrop-blur md:p-5">
            {activeTab === "billing" ? (
              <>
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-lg font-semibold">Billing Workflow</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="w-64 max-w-full"
                      placeholder="Search products"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                    />
                    <button type="button" onClick={() => void refreshProducts()}>
                      Refresh Products
                    </button>
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
          </section>
        </section>
      </div>
    </main>
  );
}
