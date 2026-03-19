import { useEffect, useMemo, useRef, useState } from "react";
import type { CartItem, Product } from "./types";

type BillingTabProps = {
  products: Product[];
  selectedProductId: string;
  addQty: string;
  cart: CartItem[];
  paymentMode: "PAID" | "PARTIAL" | "UNPAID";
  paymentMethod: "CASH" | "CARD";
  paidAmount: string;
  customerName: string;
  customerContact: string;
  subTotal: number;
  lineDiscountTotal: number;
  baseTotal: number;
  changeDue: number;
  balanceDue: number;
  onSelectedProductChange: (value: string) => void;
  onAddQtyChange: (value: string) => void;
  onAddToCart: () => void;
  onQuickAddProduct: (productId: string, qty: number) => void | Promise<void>;
  onAdjustCartQty: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onPaymentModeChange: (value: "PAID" | "PARTIAL" | "UNPAID") => void;
  onPaymentMethodChange: (value: "CASH" | "CARD") => void;
  onPaidAmountChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerContactChange: (value: string) => void;
  onHoldSale: () => void;
  onProcessSale: () => void;
};

export function BillingTab({
  products,
  selectedProductId,
  addQty,
  cart,
  paymentMode,
  paymentMethod,
  paidAmount,
  customerName,
  customerContact,
  subTotal,
  lineDiscountTotal,
  baseTotal,
  changeDue,
  balanceDue,
  onSelectedProductChange,
  onAddQtyChange,
  onAddToCart,
  onQuickAddProduct,
  onAdjustCartQty,
  onRemoveFromCart,
  onPaymentModeChange,
  onPaymentMethodChange,
  onPaidAmountChange,
  onCustomerNameChange,
  onCustomerContactChange,
  onHoldSale,
  onProcessSale,
}: BillingTabProps) {
  const [scannerInput, setScannerInput] = useState("");
  const [quickQty, setQuickQty] = useState("1");
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const scannerRef = useRef<HTMLInputElement | null>(null);

  const itemCount = useMemo(
    () => cart.reduce((acc, item) => acc + Number(item.qty), 0),
    [cart],
  );

  function handleQuickAdd() {
    const qty = Number(quickQty || "0");
    void onQuickAddProduct(scannerInput, qty);
    setScannerInput("");
    setQuickQty("1");
  }

  function openCheckoutConfirm() {
    setIsCheckoutConfirmOpen(true);
  }

  function confirmCheckout() {
    setIsCheckoutConfirmOpen(false);
    onProcessSale();
  }

  useEffect(() => {
    function onShortcut(event: Event) {
      const customEvent = event as CustomEvent<"focus-scanner" | "hold-bill" | "checkout">;
      const action = customEvent.detail;
      if (action === "focus-scanner") {
        scannerRef.current?.focus();
        scannerRef.current?.select();
      }
      if (action === "hold-bill") {
        onHoldSale();
      }
      if (action === "checkout") {
        openCheckoutConfirm();
      }
    }

    window.addEventListener("pos-shortcut", onShortcut as EventListener);
    return () => {
      window.removeEventListener("pos-shortcut", onShortcut as EventListener);
    };
  }, [onHoldSale]);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.65fr_minmax(320px,1fr)]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-background/45 p-4 md:p-5">
            <div className="mb-4 grid gap-3 rounded-xl border border-border/70 bg-card/55 p-3 md:grid-cols-[1fr_120px_auto]">
              <label className="m-0 text-sm font-medium text-foreground">
                Scan/Barcode
                <input
                  ref={scannerRef}
                  value={scannerInput}
                  placeholder="Scan barcode and press Enter"
                  onChange={(e) => setScannerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                />
              </label>

              <label className="m-0 text-sm font-medium text-foreground">
                Qty
                <input
                  value={quickQty}
                  onChange={(e) => setQuickQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                />
              </label>

              <button type="button" className="self-end md:min-w-32" onClick={handleQuickAdd}>
                Quick Add
              </button>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="m-0 flex-1 text-sm font-medium text-foreground">
                Product
                <select value={selectedProductId} onChange={(e) => onSelectedProductChange(e.target.value)}>
                  {products.map((product) => (
                    <option key={product.barcode_id} value={product.barcode_id}>
                      {product.barcode_id} | {product.name} | Rs. {Number(product.sell_price).toFixed(2)} | Stock {Number(product.stock).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="m-0 w-full text-sm font-medium text-foreground md:w-36">
                Qty
                <input value={addQty} onChange={(e) => onAddQtyChange(e.target.value)} />
              </label>

              <button type="button" className="md:min-w-36" onClick={onAddToCart}>
                Add to Cart
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/45">
            <table className="m-0">
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
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Cart is empty. Add a product to start billing.
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.product_id}>
                      <td>{item.product_id}</td>
                      <td>{item.name}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button type="button" className="!px-2 !py-1" onClick={() => onAdjustCartQty(item.product_id, -1)}>
                            -
                          </button>
                          <span className="inline-block min-w-12 text-center">{item.qty.toFixed(2)}</span>
                          <button type="button" className="!px-2 !py-1" onClick={() => onAdjustCartQty(item.product_id, 1)}>
                            +
                          </button>
                        </div>
                      </td>
                      <td>{item.price.toFixed(2)}</td>
                      <td>{item.discount.toFixed(2)}</td>
                      <td>{(item.qty * Math.max(0, item.price - item.discount)).toFixed(2)}</td>
                      <td>
                        <button type="button" className="danger" onClick={() => onRemoveFromCart(item.product_id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-2xl border border-border/80 bg-background/45 p-4 md:p-5">
          <h3 className="m-0 text-lg font-semibold text-foreground">Checkout</h3>
          <p className="mt-1 text-sm text-muted-foreground">{itemCount.toFixed(2)} items in cart</p>

          <div className="mt-4 space-y-3">
            <label className="m-0 text-sm font-medium text-foreground">
              Payment Mode
              <select value={paymentMode} onChange={(e) => onPaymentModeChange(e.target.value as "PAID" | "PARTIAL" | "UNPAID")}>
                <option value="PAID">PAID</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="UNPAID">UNPAID</option>
              </select>
            </label>

            <label className="m-0 text-sm font-medium text-foreground">
              Payment Method
              <select value={paymentMethod} onChange={(e) => onPaymentMethodChange(e.target.value as "CASH" | "CARD") }>
                <option value="CASH">CASH</option>
                <option value="CARD">CARD</option>
              </select>
            </label>

            <label className="m-0 text-sm font-medium text-foreground">
              Paid Amount
              <input
                value={paidAmount}
                onChange={(e) => onPaidAmountChange(e.target.value)}
                placeholder={paymentMode === "PAID" ? "Blank = full amount" : "Required"}
              />
            </label>

            <label className="m-0 text-sm font-medium text-foreground">
              Customer Name (credit only)
              <input value={customerName} onChange={(e) => onCustomerNameChange(e.target.value)} />
            </label>

            <label className="m-0 text-sm font-medium text-foreground">
              Customer Contact
              <input value={customerContact} onChange={(e) => onCustomerContactChange(e.target.value)} />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-card/55 p-3 text-sm">
            <p className="m-0 text-muted-foreground">Subtotal</p>
            <p className="m-0 text-right font-semibold text-foreground">Rs. {subTotal.toFixed(2)}</p>
            <p className="m-0 text-muted-foreground">Line Discount</p>
            <p className="m-0 text-right font-semibold text-foreground">Rs. {lineDiscountTotal.toFixed(2)}</p>
            <p className="m-0 text-muted-foreground">Total</p>
            <p className="m-0 text-right font-semibold text-foreground">Rs. {baseTotal.toFixed(2)}</p>
            <p className="m-0 text-muted-foreground">Change</p>
            <p className="m-0 text-right font-semibold text-foreground">Rs. {changeDue.toFixed(2)}</p>
            <p className="m-0 text-muted-foreground">Balance Due</p>
            <p className="m-0 text-right font-semibold text-foreground">Rs. {balanceDue.toFixed(2)}</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" className="!bg-gradient-to-r !from-slate-500 !to-slate-600 !text-white" onClick={onHoldSale}>
              Hold Bill
            </button>
            <button type="button" className="!bg-gradient-to-r !from-emerald-400 !to-emerald-500 !text-slate-900" onClick={openCheckoutConfirm}>
              Checkout
            </button>
          </div>
        </aside>
      </div>

      {isCheckoutConfirmOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Checkout confirmation">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 shadow-panel">
            <h4 className="m-0 text-lg font-semibold text-foreground">Confirm Checkout</h4>
            <p className="mt-2 text-sm text-muted-foreground">Review totals before finalizing the sale.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-background/50 p-3 text-sm">
              <p className="m-0 text-muted-foreground">Total</p>
              <p className="m-0 text-right font-semibold text-foreground">Rs. {baseTotal.toFixed(2)}</p>
              <p className="m-0 text-muted-foreground">Paid</p>
              <p className="m-0 text-right font-semibold text-foreground">{paidAmount.trim() || "Auto"}</p>
              <p className="m-0 text-muted-foreground">Mode</p>
              <p className="m-0 text-right font-semibold text-foreground">{paymentMode}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="!bg-slate-600 !text-white" onClick={() => setIsCheckoutConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="!bg-emerald-500 !text-slate-900" onClick={confirmCheckout}>
                Confirm Checkout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
