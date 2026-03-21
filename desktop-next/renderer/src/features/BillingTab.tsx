import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CartItem, Product } from "./types";

type BillingTabProps = {
  products: Product[];
  cart: CartItem[];
  paymentMode: "PAID" | "PARTIAL" | "UNPAID";
  paymentMethod: "CASH" | "CARD";
  paidAmount: string;
  customerName: string;
  customerContact: string;
  subTotal: number;
  lineDiscountTotal: number;
  baseTotal: number;
  cardSurchargeTotal: number;
  totalAmount: number;
  changeDue: number;
  balanceDue: number;
  onQuickAddProduct: (productId: string, qty: number) => void | Promise<void>;
  onUpdateCartDiscount: (productId: string, mode: "percent" | "amount", value: string) => void;
  onAdjustCartQty: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onPaymentModeChange: (value: "PAID" | "PARTIAL" | "UNPAID") => void;
  onPaymentMethodChange: (value: "CASH" | "CARD") => void;
  onPaidAmountChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerContactChange: (value: string) => void;
  onHoldSale: () => void;
  onProcessSale: (withPrint: boolean) => void;
};

export function BillingTab({
  products,
  cart,
  paymentMode,
  paymentMethod,
  paidAmount,
  customerName,
  customerContact,
  subTotal,
  lineDiscountTotal,
  baseTotal,
  cardSurchargeTotal,
  totalAmount,
  changeDue,
  balanceDue,
  onQuickAddProduct,
  onUpdateCartDiscount,
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
  const { t } = useTranslation();
  const [scannerInput, setScannerInput] = useState("");
  const [productNameInput, setProductNameInput] = useState("");
  const [quickQty, setQuickQty] = useState("1");
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, { percent: string; amount: string }>>({});
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const scannerRef = useRef<HTMLInputElement | null>(null);

  const itemCount = useMemo(
    () => cart.reduce((acc, item) => acc + Number(item.qty), 0),
    [cart],
  );

  const matchedById = useMemo(() => {
    const needle = scannerInput.trim().toLowerCase();
    if (!needle) {
      return null;
    }
    return (
      products.find((product) => product.barcode_id.toLowerCase() === needle) ||
      products.find((product) => product.name.toLowerCase() === needle) ||
      null
    );
  }, [products, scannerInput]);

  const nameSuggestions = useMemo(() => {
    const needle = productNameInput.trim().toLowerCase();
    if (!needle) {
      return products.slice(0, 12);
    }
    return products
      .filter((product) => product.name.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [products, productNameInput]);

  async function handleQuickAdd() {
    const resolvedId = scannerInput.trim() || matchedById?.barcode_id || "";
    const qty = Number(quickQty || "0");
    if (!resolvedId || !Number.isFinite(qty) || qty <= 0) {
      return;
    }
    await onQuickAddProduct(resolvedId, qty);
    setScannerInput("");
    setProductNameInput("");
    setQuickQty("1");
    scannerRef.current?.focus();
  }

  function handleBarcodeInput(value: string) {
    setScannerInput(value);
    const needle = value.trim().toLowerCase();
    if (!needle) {
      return;
    }
    const exact =
      products.find((product) => product.barcode_id.toLowerCase() === needle) ||
      products.find((product) => product.name.toLowerCase() === needle);
    if (exact) {
      setProductNameInput(exact.name);
    }
  }

  function handleProductNameInput(value: string) {
    setProductNameInput(value);
    const needle = value.trim().toLowerCase();
    if (!needle) {
      return;
    }
    const exact = products.find((product) => product.name.toLowerCase() === needle);
    if (exact) {
      setScannerInput(exact.barcode_id);
    }
  }

  function openCheckoutConfirm() {
    setIsCheckoutConfirmOpen(true);
  }

  function confirmCheckout(withPrint: boolean) {
    setIsCheckoutConfirmOpen(false);
    onProcessSale(withPrint);
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

  useEffect(() => {
    setDiscountDrafts((prev) => {
      const next: Record<string, { percent: string; amount: string }> = {};
      for (const item of cart) {
        const discountPct = item.price > 0 ? Number(((item.discount / item.price) * 100).toFixed(2)) : 0;
        const previous = prev[item.product_id];
        next[item.product_id] = {
          percent: previous?.percent ?? discountPct.toFixed(2),
          amount: previous?.amount ?? item.discount.toFixed(2),
        };
      }
      return next;
    });
  }, [cart]);

  return (
    <section className="space-y-4">
      <div className="space-y-4">
        <section className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-background/45 p-4 md:p-5">
            <div className="grid gap-3 rounded-xl border border-border/70 bg-card/55 p-3 md:grid-cols-[1fr_1fr_120px_auto]">
              <label className="m-0 text-sm font-medium text-foreground">
                {t("billing.productId")}
                <input
                  ref={scannerRef}
                  value={scannerInput}
                  placeholder={t("billing.scanPlaceholder")}
                  onChange={(e) => handleBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleQuickAdd();
                    }
                  }}
                />
              </label>

              <label className="m-0 text-sm font-medium text-foreground">
                {t("billing.productName")}
                <div className="relative">
                  <input
                    value={productNameInput}
                    placeholder={t("billing.searchPlaceholder")}
                    onChange={(e) => handleProductNameInput(e.target.value)}
                  />
                  {productNameInput.trim() ? (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-slate-600 bg-slate-900 text-slate-100">
                      {nameSuggestions.length === 0 ? (
                          <p className="m-0 px-3 py-2 text-sm text-slate-300">{t("billing.noMatching")}</p>
                      ) : (
                        nameSuggestions.map((product) => (
                          <div
                            key={product.barcode_id}
                            role="button"
                            tabIndex={0}
                              className="flex w-full flex-col items-start gap-0.5 border-0 border-b border-slate-700 bg-slate-900 px-3 py-2 text-left text-[15px] text-slate-100 hover:bg-slate-800 focus:bg-slate-800"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setProductNameInput(product.name);
                              setScannerInput(product.barcode_id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setProductNameInput(product.name);
                                setScannerInput(product.barcode_id);
                              }
                            }}
                          >
                              <span className="font-semibold text-slate-100">{product.name}</span>
                              <span className="text-sm text-slate-300">
                              {product.barcode_id} | Rs. {Number(product.sell_price).toFixed(2)} | Stock {Number(product.stock).toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="m-0 text-sm font-medium text-foreground">
                {t("billing.qty")}
                <input
                  value={quickQty}
                  onChange={(e) => setQuickQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleQuickAdd();
                    }
                  }}
                />
              </label>

              <button type="button" className="self-end md:min-w-32" onClick={() => void handleQuickAdd()}>
                {t("billing.addToCart")}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/45">
            <table className="m-0">
              <thead>
                <tr>
                  <th>{t("billing.id")}</th>
                  <th>{t("billing.name")}</th>
                  <th>{t("billing.qty")}</th>
                  <th>{t("billing.price")}</th>
                  <th>{t("billing.discPct")}</th>
                  <th>{t("billing.disc")}</th>
                  <th>{t("billing.total")}</th>
                  <th>{t("billing.action")}</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      {t("billing.empty")}
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => {
                    const discountPct = item.price > 0 ? Number(((item.discount / item.price) * 100).toFixed(2)) : 0;
                    const draft = discountDrafts[item.product_id] || {
                      percent: discountPct.toFixed(2),
                      amount: item.discount.toFixed(2),
                    };
                    return (
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
                        <td>
                          <input
                            className="w-16 min-w-[64px]"
                            value={draft.percent}
                            onChange={(event) => {
                              const value = event.target.value;
                              setDiscountDrafts((prev) => ({
                                ...prev,
                                [item.product_id]: {
                                  ...(prev[item.product_id] || { percent: "", amount: "" }),
                                  percent: value,
                                },
                              }));
                            }}
                            onBlur={(event) => {
                              onUpdateCartDiscount(item.product_id, "percent", event.target.value);
                              const clamped = Math.max(0, Math.min(100, Number(event.target.value || "0")));
                              setDiscountDrafts((prev) => ({
                                ...prev,
                                [item.product_id]: {
                                  ...(prev[item.product_id] || { percent: "", amount: "" }),
                                  percent: Number.isFinite(clamped) ? clamped.toFixed(2) : "0.00",
                                  amount: Number((((item.price || 0) * clamped) / 100).toFixed(2)).toFixed(2),
                                },
                              }));
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="w-16 min-w-[64px]"
                            value={draft.amount}
                            onChange={(event) => {
                              const value = event.target.value;
                              setDiscountDrafts((prev) => ({
                                ...prev,
                                [item.product_id]: {
                                  ...(prev[item.product_id] || { percent: "", amount: "" }),
                                  amount: value,
                                },
                              }));
                            }}
                            onBlur={(event) => {
                              onUpdateCartDiscount(item.product_id, "amount", event.target.value);
                              const clamped = Math.max(0, Math.min(item.price, Number(event.target.value || "0")));
                              const percent = item.price > 0 ? Number(((clamped / item.price) * 100).toFixed(2)) : 0;
                              setDiscountDrafts((prev) => ({
                                ...prev,
                                [item.product_id]: {
                                  ...(prev[item.product_id] || { percent: "", amount: "" }),
                                  amount: Number.isFinite(clamped) ? clamped.toFixed(2) : "0.00",
                                  percent: Number.isFinite(percent) ? percent.toFixed(2) : "0.00",
                                },
                              }));
                            }}
                          />
                        </td>
                        <td>{(item.qty * Math.max(0, item.price - item.discount)).toFixed(2)}</td>
                        <td>
                          <button type="button" className="danger" onClick={() => onRemoveFromCart(item.product_id)}>
                            {t("billing.remove")}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-2xl border border-border/80 bg-background/45 p-4 md:p-5">
          <h3 className="m-0 text-lg font-semibold text-foreground">{t("billing.checkout")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("billing.itemsInCart", { count: Number(itemCount.toFixed(2)) })}</p>

          <div className="mt-4 space-y-3">
            <label className="m-0 text-sm font-medium text-foreground">
              {t("billing.paymentMode")}
              <select value={paymentMode} onChange={(e) => onPaymentModeChange(e.target.value as "PAID" | "PARTIAL" | "UNPAID")}>
                <option value="PAID">{t("billing.paid")}</option>
                <option value="PARTIAL">{t("billing.partial")}</option>
                <option value="UNPAID">{t("billing.unpaid")}</option>
              </select>
            </label>

            {paymentMode !== "PARTIAL" && (
              <label className="m-0 text-sm font-medium text-foreground">
                {t("billing.paymentMethod")}
                <select value={paymentMethod} onChange={(e) => onPaymentMethodChange(e.target.value as "CASH" | "CARD") }>
                  <option value="CASH">{t("billing.cash")}</option>
                  <option value="CARD">{t("billing.card")}</option>
                </select>
              </label>
            )}

            {paymentMode !== "UNPAID" && paymentMethod !== "CARD" && (
              <label className="m-0 text-sm font-medium text-foreground">
                {t("billing.paidAmount")}
                <input
                  value={paidAmount}
                  onChange={(e) => onPaidAmountChange(e.target.value)}
                  placeholder={paymentMode === "PAID" ? t("billing.paidPlaceholderFull") : t("billing.paidPlaceholderRequired")}
                />
              </label>
            )}

            {paymentMode !== "PAID" && (
              <>
                <label className="m-0 text-sm font-medium text-foreground">
                  {t("billing.customerName")}
                  <input value={customerName} onChange={(e) => onCustomerNameChange(e.target.value)} />
                </label>

                <label className="m-0 text-sm font-medium text-foreground">
                  {t("billing.customerContact")}
                  <input value={customerContact} onChange={(e) => onCustomerContactChange(e.target.value)} />
                </label>
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-card/55 p-3 text-sm">
            <p className="m-0 text-muted-foreground">{t("billing.subtotal")}</p>
            <p className="m-0 text-right font-semibold text-foreground">Rs. {subTotal.toFixed(2)}</p>
            <p className="m-0 text-muted-foreground">{t("billing.lineDiscount")}</p>
            <p className="m-0 text-right font-semibold text-foreground">Rs. {lineDiscountTotal.toFixed(2)}</p>
            {paymentMethod === "CARD" && cardSurchargeTotal > 0 ? (
              <>
                <p className="m-0 text-muted-foreground">{t("billing.cardSurcharge")}</p>
                <p className="m-0 text-right font-semibold text-foreground">Rs. {cardSurchargeTotal.toFixed(2)}</p>
              </>
            ) : null}
            <p className="m-0 text-muted-foreground">{t("billing.total")}</p>
            <p className="m-0 text-right text-lg font-bold" style={{ color: "#7dd3fc" }}>Rs. {totalAmount.toFixed(2)}</p>
            <p className="m-0 text-muted-foreground">{t("billing.balanceDue")}</p>
            <p className="m-0 text-right font-semibold text-foreground">Rs. {balanceDue.toFixed(2)}</p>
            <p className="m-0 text-muted-foreground">{t("billing.change")}</p>
            <p className="m-0 text-right text-lg font-bold" style={{ color: "#7dfcb4" }}>Rs. {changeDue.toFixed(2)}</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" className="!bg-gradient-to-r !from-slate-500 !to-slate-600 !text-white transition-all hover:shadow-lg" onClick={onHoldSale}>
              {t("billing.holdBill")}
            </button>
            <button type="button" className="!bg-gradient-to-r !from-emerald-400 !to-emerald-500 !text-slate-900 transition-all hover:shadow-lg" onClick={openCheckoutConfirm}>
              {t("billing.checkout")}
            </button>
          </div>
        </aside>
      </div>

      {isCheckoutConfirmOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label={t("billing.checkoutConfirm") }>
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 shadow-panel">
            <h4 className="m-0 text-lg font-semibold text-foreground">{t("billing.checkoutConfirm")}</h4>
            <p className="mt-2 text-sm text-muted-foreground">{t("billing.checkoutReview")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-background/50 p-3 text-sm">
              <p className="m-0 text-muted-foreground">{t("billing.total")}</p>
              <p className="m-0 text-right font-bold" style={{ color: "#7dd3fc" }}>Rs. {totalAmount.toFixed(2)}</p>
              {paymentMethod === "CARD" && cardSurchargeTotal > 0 ? (
                <>
                  <p className="m-0 text-muted-foreground">{t("billing.cardSurcharge")}</p>
                  <p className="m-0 text-right font-semibold text-foreground">Rs. {cardSurchargeTotal.toFixed(2)}</p>
                </>
              ) : null}
              <p className="m-0 text-muted-foreground">{t("billing.paid")}</p>
              <p className="m-0 text-right font-semibold text-foreground">
                {paymentMethod === "CARD" ? `Rs. ${totalAmount.toFixed(2)}` : paidAmount.trim() || t("billing.auto")}
              </p>
              <p className="m-0 text-muted-foreground">{t("billing.mode")}</p>
              <p className="m-0 text-right font-semibold text-foreground">{paymentMode}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="!bg-slate-600 !text-white" onClick={() => setIsCheckoutConfirmOpen(false)}>
                {t("billing.cancel")}
              </button>
              <button type="button" className="!bg-slate-700 !text-white" onClick={() => confirmCheckout(false)}>
                {t("billing.checkoutWithoutPrint")}
              </button>
              <button type="button" className="!bg-emerald-500 !text-slate-900" onClick={() => confirmCheckout(true)}>
                {t("billing.printAndCheckout")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
