import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CartItem, Customer, Product } from "./types";

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
  onQuickAddProduct: (productIdOrBarcode: string, qty: number, resolvedProductId?: number) => void | Promise<void>;
  onResolveBarcodeVariants?: (barcode: string) => Promise<Product[]>;
  onUpdateCartDiscount: (productId: number, mode: "percent" | "amount", value: string) => void;
  onAdjustCartQty: (productId: number, delta: number) => void;
  onSetCartQty: (productId: number, qty: number) => void;
  onRemoveFromCart: (productId: number) => void;
  onPaymentModeChange: (value: "PAID" | "PARTIAL" | "UNPAID") => void;
  onPaymentMethodChange: (value: "CASH" | "CARD") => void;
  onPaidAmountChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerContactChange: (value: string) => void;
  customerSuggestions: Customer[];
  onCustomerSuggestionSelect: (customer: Customer) => void;
  onSearchProducts?: (searchText: string, limit?: number) => Promise<Product[]>;
  onHoldSale: () => void;
  onClearCart: () => void;
  onProcessSale: (withPrint: boolean) => void;
  onAddAdhocItem: (name: string, qty: number, price: number, discount: number) => void;
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
  onResolveBarcodeVariants,
  onUpdateCartDiscount,
  onAdjustCartQty,
  onSetCartQty,
  onRemoveFromCart,
  onPaymentModeChange,
  onPaymentMethodChange,
  onPaidAmountChange,
  onCustomerNameChange,
  onCustomerContactChange,
  customerSuggestions,
  onCustomerSuggestionSelect,
  onSearchProducts,
  onHoldSale,
  onClearCart,
  onProcessSale,
  onAddAdhocItem,
}: BillingTabProps) {
  const { t } = useTranslation();
  const discountsLocked = paymentMode === "UNPAID";
  const [scannerInput, setScannerInput] = useState("");
  const [productNameInput, setProductNameInput] = useState("");
  const [quickQty, setQuickQty] = useState("1");
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, { percent: string; amount: string }>>({});
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [remoteNameSuggestions, setRemoteNameSuggestions] = useState<Product[] | null>(null);
  const [remoteMatchedById, setRemoteMatchedById] = useState<Product | null>(null);
  const [variantModalState, setVariantModalState] = useState<{ barcode: string; qty: number; options: Product[] } | null>(null);
  const [variantModalIndex, setVariantModalIndex] = useState(0);
  const [stockWarningMessage, setStockWarningMessage] = useState<string | null>(null);
  const scannerRef = useRef<HTMLInputElement | null>(null);
  const variantFirstButtonRef = useRef<HTMLButtonElement | null>(null);
  const handleBarcodeInputRef = useRef(handleBarcodeInput);

  // Ad-hoc / custom item form state
  const [showAdhocForm, setShowAdhocForm] = useState(false);
  const [adhocName, setAdhocName] = useState("");
  const [adhocQty, setAdhocQty] = useState("1");
  const [adhocPrice, setAdhocPrice] = useState("");
  const [adhocDiscPct, setAdhocDiscPct] = useState("0");
  const [adhocDiscAmt, setAdhocDiscAmt] = useState("0");
  const adhocNameRef = useRef<HTMLInputElement | null>(null);

  const itemCount = useMemo(
    () => cart.reduce((acc, item) => acc + Number(item.qty), 0),
    [cart],
  );

  const matchedById = useMemo(() => {
    const needle = scannerInput.trim().toLowerCase();
    if (!needle) {
      return remoteMatchedById;
    }
    const localMatch = (
      products.find((product) => product.barcode_id.toLowerCase() === needle) ||
      products.find((product) => product.name.toLowerCase() === needle) ||
      null
    );
    return localMatch || remoteMatchedById;
  }, [products, scannerInput, remoteMatchedById]);

  const nameSuggestions = useMemo(() => {
    if (remoteNameSuggestions) {
      return remoteNameSuggestions;
    }
    const needle = productNameInput.trim().toLowerCase();
    if (!needle) {
      return products.slice(0, 12);
    }
    return products
      .filter((product) => product.name.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [products, productNameInput, remoteNameSuggestions]);

  useEffect(() => {
    const needle = productNameInput.trim();
    if (!needle || !onSearchProducts) {
      setRemoteNameSuggestions(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const rows = await onSearchProducts(needle, 12);
        if (!cancelled) {
          setRemoteNameSuggestions(rows);
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [productNameInput, onSearchProducts]);

  useEffect(() => {
    const needle = scannerInput.trim();
    if (!needle || !onSearchProducts) {
      setRemoteMatchedById(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const rows = await onSearchProducts(needle, 12);
        if (cancelled) {
          return;
        }
        const exact = rows.find(
          (product) =>
            product.barcode_id.toLowerCase() === needle.toLowerCase() || product.name.toLowerCase() === needle.toLowerCase(),
        );
        setRemoteMatchedById(exact || null);
      })();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [scannerInput, onSearchProducts]);

  async function handleQuickAdd() {
    const resolvedId = scannerInput.trim() || matchedById?.barcode_id || "";
    const qty = Number(quickQty || "0");
    if (!resolvedId || !Number.isFinite(qty) || qty <= 0) {
      return;
    }

    const needle = resolvedId.trim().toLowerCase();
    const localCandidates = products.filter((product) => product.barcode_id.trim().toLowerCase() === needle);
    let candidates = localCandidates;

    if (candidates.length <= 1 && onResolveBarcodeVariants) {
      const remoteCandidates = await onResolveBarcodeVariants(resolvedId);
      if (remoteCandidates.length > 0) {
        candidates = remoteCandidates;
      }
    }

    if (candidates.length > 1) {
      setVariantModalState({
        barcode: resolvedId,
        qty,
        options: candidates,
      });
      return;
    }

    if (candidates.length === 1) {
      if (Number(candidates[0].stock) <= 0) {
        setStockWarningMessage(t("billing.zeroStockWarning"));
        return;
      }
      if (qty > Number(candidates[0].stock)) {
        setStockWarningMessage(t("billing.insufficientStockWarning", { available: Number(candidates[0].stock).toFixed(2) }));
        return;
      }
      await onQuickAddProduct(resolvedId, qty, Number(candidates[0].id));
    } else {
      await onQuickAddProduct(resolvedId, qty);
    }
    setScannerInput("");
    setProductNameInput("");
    setQuickQty("1");
    scannerRef.current?.focus();
  }

  // ── Ad-hoc discount sync helpers ──────────────────────────────────────────
  function handleAdhocDiscPctChange(value: string) {
    setAdhocDiscPct(value);
    const pct = Math.max(0, Math.min(100, Number(value || "0")));
    const price = Number(adhocPrice || "0");
    if (Number.isFinite(pct) && Number.isFinite(price)) {
      setAdhocDiscAmt(Number((price * pct) / 100).toFixed(2));
    }
  }

  function handleAdhocDiscAmtChange(value: string) {
    setAdhocDiscAmt(value);
    const price = Number(adhocPrice || "0");
    const amt = Math.max(0, Math.min(price, Number(value || "0")));
    if (Number.isFinite(amt) && price > 0) {
      setAdhocDiscPct(Number((amt / price) * 100).toFixed(2));
    } else {
      setAdhocDiscPct("0");
    }
  }

  function handleAddAdhocItem() {
    const name = adhocName.trim();
    const qty = Number(adhocQty || "0");
    const price = Number(adhocPrice || "0");
    const discount = Math.max(0, Math.min(price, Number(adhocDiscAmt || "0")));
    if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      return;
    }
    onAddAdhocItem(name, qty, price, discount);
    // Reset form fields but keep panel open for quick re-entry
    setAdhocName("");
    setAdhocQty("1");
    setAdhocPrice("");
    setAdhocDiscPct("0");
    setAdhocDiscAmt("0");
    adhocNameRef.current?.focus();
  }

  async function handleVariantSelect(variant: Product) {
    if (!variantModalState) {
      return;
    }
    if (Number(variant.stock) <= 0) {
      setStockWarningMessage(t("billing.zeroStockWarning"));
      return;
    }
    if (variantModalState.qty > Number(variant.stock)) {
      setStockWarningMessage(t("billing.insufficientStockWarning", { available: Number(variant.stock).toFixed(2) }));
      return;
    }
    await onQuickAddProduct(variantModalState.barcode, variantModalState.qty, Number(variant.id));
    setVariantModalState(null);
    setVariantModalIndex(0);
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

  // Keep the ref in sync with the latest handleBarcodeInput so the stable
  // keydown listener below can call it without a stale closure.
  useEffect(() => {
    handleBarcodeInputRef.current = handleBarcodeInput;
  });

  // Intercept printable keystrokes that land outside any text input and
  // redirect them to the scanner field.  This prevents barcode scanner
  // Enter events from accidentally clicking the focused +/- qty button.
  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length !== 1) return; // skip Enter, F-keys, arrows, etc.

      const scanner = scannerRef.current;
      if (!scanner) return;
      e.preventDefault();
      scanner.focus();
      handleBarcodeInputRef.current(scanner.value + e.key);
    }

    document.addEventListener("keydown", onGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", onGlobalKeyDown);
    };
  }, []); // stable — uses only refs

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

  useEffect(() => {
    if (!variantModalState) {
      setVariantModalIndex(0);
      return;
    }
    setVariantModalIndex(0);
    const timer = window.setTimeout(() => {
      variantFirstButtonRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [variantModalState]);

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
              <button
                type="button"
                id="billing-custom-item-toggle"
                className={`self-end md:min-w-36 !border transition-colors ${
                  showAdhocForm
                    ? "!bg-emerald-600 !text-white hover:!bg-emerald-500"
                    : "!bg-slate-700 !text-emerald-300 hover:!bg-slate-600"
                }`}
                onClick={() => {
                  setShowAdhocForm((prev) => !prev);
                  if (!showAdhocForm) {
                    // Focus name field after expand
                    window.setTimeout(() => adhocNameRef.current?.focus(), 50);
                  }
                }}
              >
                {showAdhocForm ? t("billing.customItemClose") : t("billing.customItemToggle")}
              </button>
            </div>

            {/* ── Custom / Ad-hoc Item Form ────────────────────────────────── */}
            {showAdhocForm && (
              <div
                id="billing-custom-item-form"
                className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  {t("billing.customItemPanelTitle")}
                </p>
                <div className="grid gap-3 md:grid-cols-[1fr_80px_120px_100px_100px_auto]">
                  <label className="m-0 text-sm font-medium text-foreground">
                    {t("billing.customItemName")}
                    <input
                      ref={adhocNameRef}
                      id="adhoc-item-name"
                      value={adhocName}
                      placeholder={t("billing.customItemNamePlaceholder")}
                      onChange={(e) => setAdhocName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAdhocItem(); } }}
                    />
                  </label>

                  <label className="m-0 text-sm font-medium text-foreground">
                    {t("billing.customItemQty")}
                    <input
                      id="adhoc-item-qty"
                      type="number"
                      min="0.01"
                      step="1"
                      value={adhocQty}
                      onChange={(e) => setAdhocQty(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAdhocItem(); } }}
                    />
                  </label>

                  <label className="m-0 text-sm font-medium text-foreground">
                    {t("billing.customItemPrice")}
                    <input
                      id="adhoc-item-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={adhocPrice}
                      placeholder="0.00"
                      onChange={(e) => {
                        setAdhocPrice(e.target.value);
                        // Re-sync discount amount when price changes
                        const price = Number(e.target.value || "0");
                        const pct = Number(adhocDiscPct || "0");
                        if (Number.isFinite(price) && Number.isFinite(pct)) {
                          setAdhocDiscAmt(Number((price * pct) / 100).toFixed(2));
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAdhocItem(); } }}
                    />
                  </label>

                  <label className="m-0 text-sm font-medium text-foreground">
                    {t("billing.customItemDiscPct")}
                    <input
                      id="adhoc-item-disc-pct"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={adhocDiscPct}
                      onChange={(e) => handleAdhocDiscPctChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAdhocItem(); } }}
                    />
                  </label>

                  <label className="m-0 text-sm font-medium text-foreground">
                    {t("billing.customItemDiscAmt")}
                    <input
                      id="adhoc-item-disc-amt"
                      type="number"
                      min="0"
                      step="0.01"
                      value={adhocDiscAmt}
                      onChange={(e) => handleAdhocDiscAmtChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAdhocItem(); } }}
                    />
                  </label>

                  <button
                    type="button"
                    id="adhoc-add-to-cart-btn"
                    className="self-end !bg-emerald-600 !text-white hover:!bg-emerald-500"
                    onClick={handleAddAdhocItem}
                  >
                    {t("billing.customItemAddBtn")}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/45">
            <table className="m-0">
              <thead>
                <tr>
                  <th>{t("billing.itemNo")}</th>
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
                  cart.map((item, index) => {
                    const effectiveDiscount = discountsLocked ? 0 : Number(item.discount);
                    const discountPct = item.price > 0 ? Number(((effectiveDiscount / item.price) * 100).toFixed(2)) : 0;
                    const draft = discountDrafts[item.product_id] || {
                      percent: discountPct.toFixed(2),
                      amount: effectiveDiscount.toFixed(2),
                    };
                    return (
                      <tr key={item.product_id}>
                        <td>{index + 1}</td>
                        <td>
                          {item.name}
                          {item.is_adhoc && (
                            <span
                              className="ml-1.5 rounded bg-emerald-600/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400"
                            >
                              {t("billing.customItemBadge")}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button type="button" className="!px-2 !py-1" onClick={() => onAdjustCartQty(item.product_id, -1)}>
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              key={item.qty}
                              className="h-8 w-16 min-w-[64px] rounded-md border border-input bg-transparent px-2 text-center text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              defaultValue={item.qty}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => {
                                const parsed = parseFloat(e.target.value);
                                if (!Number.isFinite(parsed) || parsed <= 0) {
                                  onRemoveFromCart(item.product_id);
                                } else {
                                  onSetCartQty(item.product_id, parsed);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                  scannerRef.current?.focus();
                                }
                              }}
                            />
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
                            disabled={discountsLocked}
                            onChange={(event) => {
                              if (discountsLocked) {
                                return;
                              }
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
                              if (discountsLocked) {
                                setDiscountDrafts((prev) => ({
                                  ...prev,
                                  [item.product_id]: {
                                    ...(prev[item.product_id] || { percent: "", amount: "" }),
                                    percent: "0.00",
                                    amount: "0.00",
                                  },
                                }));
                                return;
                              }
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
                            disabled={discountsLocked}
                            onChange={(event) => {
                              if (discountsLocked) {
                                return;
                              }
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
                              if (discountsLocked) {
                                setDiscountDrafts((prev) => ({
                                  ...prev,
                                  [item.product_id]: {
                                    ...(prev[item.product_id] || { percent: "", amount: "" }),
                                    percent: "0.00",
                                    amount: "0.00",
                                  },
                                }));
                                return;
                              }
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
                        <td>{(item.qty * Math.max(0, item.price - effectiveDiscount)).toFixed(2)}</td>
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
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="m-0 text-lg font-semibold text-foreground">{t("billing.checkout")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("billing.itemsInCart", { count: Number(itemCount.toFixed(2)) })}</p>
            </div>
            <button
              type="button"
              title={t("billing.clearCartTooltip")}
              disabled={cart.length === 0}
              onClick={() => setIsClearCartConfirmOpen(true)}
              className="!bg-slate-700 !text-rose-100 hover:!bg-slate-600 focus-visible:!ring-rose-300/60 flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-300/40 px-2.5 py-1.5 text-sm font-medium transition-colors disabled:!bg-slate-800 disabled:!text-slate-500 disabled:!border-slate-600 disabled:pointer-events-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              {t("billing.clearCart")}
            </button>
          </div>

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
                  <div className="relative">
                    <input
                      value={customerName}
                      onChange={(e) => {
                        onCustomerNameChange(e.target.value);
                        setShowCustomerSuggestions(true);
                      }}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowCustomerSuggestions(false), 120);
                      }}
                    />
                    {showCustomerSuggestions && customerName.trim() ? (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-slate-600 bg-slate-900 text-slate-100">
                        {customerSuggestions.length === 0 ? (
                          <p className="m-0 px-3 py-2 text-sm text-slate-300">{t("billing.noMatching")}</p>
                        ) : (
                          customerSuggestions.map((customer) => (
                            <div
                              key={customer.id}
                              role="button"
                              tabIndex={0}
                              className="flex w-full flex-col items-start gap-0.5 border-0 border-b border-slate-700 bg-slate-900 px-3 py-2 text-left text-[15px] text-slate-100 hover:bg-slate-800 focus:bg-slate-800"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                onCustomerSuggestionSelect(customer);
                                setShowCustomerSuggestions(false);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  onCustomerSuggestionSelect(customer);
                                  setShowCustomerSuggestions(false);
                                }
                              }}
                            >
                              <span className="font-semibold text-slate-100">{customer.name}</span>
                              <span className="text-sm text-slate-300">
                                {customer.contact || "-"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
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

      {variantModalState ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("billing.variantMenuAria")}
          onKeyDown={(event) => {
            if (!variantModalState || variantModalState.options.length === 0) {
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setVariantModalState(null);
              setVariantModalIndex(0);
              scannerRef.current?.focus();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setVariantModalIndex((idx) => (idx + 1) % variantModalState.options.length);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setVariantModalIndex((idx) => (idx - 1 + variantModalState.options.length) % variantModalState.options.length);
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              void handleVariantSelect(variantModalState.options[variantModalIndex] || variantModalState.options[0]);
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-5 shadow-panel">
            <h4 className="m-0 text-lg font-semibold text-foreground">{t("billing.variantMenuTitle")}</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("billing.variantMenuDescription", { barcode: variantModalState.barcode })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("billing.variantMenuHint")}</p>
            <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-border/80 bg-background/40">
              <table className="m-0">
                <thead>
                  <tr>
                    <th>{t("billing.id")}</th>
                    <th>{t("billing.name")}</th>
                    <th>{t("billing.variantSell")}</th>
                    <th>{t("billing.variantStock")}</th>
                    <th>{t("billing.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {variantModalState.options.map((variant, index) => (
                    <tr key={variant.id} className={index === variantModalIndex ? "bg-cyan-950/35" : undefined}>
                      <td>{variant.id}</td>
                      <td>{variant.name}</td>
                      <td>{Number(variant.sell_price).toFixed(2)}</td>
                      <td>{Number(variant.stock).toFixed(2)}</td>
                      <td>
                        <button
                          ref={index === 0 ? variantFirstButtonRef : undefined}
                          type="button"
                          className="px-2 py-1 text-xs"
                          onFocus={() => setVariantModalIndex(index)}
                          onClick={() => {
                            void handleVariantSelect(variant);
                          }}
                        >
                          {t("billing.selectVariant")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="!bg-slate-600 !text-white"
                onClick={() => {
                  setVariantModalState(null);
                  setVariantModalIndex(0);
                  scannerRef.current?.focus();
                }}
              >
                {t("billing.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stockWarningMessage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("billing.stockWarningTitle")}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter") {
              event.preventDefault();
              setStockWarningMessage(null);
              scannerRef.current?.focus();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 shadow-panel">
            <h4 className="m-0 text-lg font-semibold text-foreground">{t("billing.stockWarningTitle")}</h4>
            <p className="mt-2 text-sm text-muted-foreground">{stockWarningMessage}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="!bg-slate-600 !text-white"
                onClick={() => {
                  setStockWarningMessage(null);
                  scannerRef.current?.focus();
                }}
              >
                {t("billing.ok")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      {isClearCartConfirmOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label={t("billing.clearCartConfirm")}>
          <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-5 shadow-panel">
            <h4 className="m-0 text-lg font-semibold text-foreground">{t("billing.clearCartConfirm")}</h4>
            <p className="mt-2 text-sm text-muted-foreground">{t("billing.clearCartMessage", { count: cart.length })}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{t("billing.clearCartUndo")}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="!bg-slate-600 !text-white" onClick={() => setIsClearCartConfirmOpen(false)}>
                {t("billing.cancel")}
              </button>
              <button
                type="button"
                className="!bg-red-600 !text-white hover:!bg-red-500"
                onClick={() => {
                  onClearCart();
                  setIsClearCartConfirmOpen(false);
                }}
              >
                {t("billing.clearCart")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
