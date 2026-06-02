import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";
import type { Product } from "./types";

type ReturnCartItem = {
  product_id: number;
  barcode_id: string;
  name: string;
  qty: number;
  return_price: number;
};

type ReturnRow = {
  id: number;
  timestamp: string;
  note: string | null;
  cashier: string | null;
  item_count: number;
  return_total: number;
  item_names: string | null;
};

type ReturnsTabProps = {
  cashierId: number;
  onSearchProducts?: (searchText: string, limit?: number) => Promise<Product[]>;
  onResolveBarcodeVariants?: (barcode: string) => Promise<Product[]>;
  onProcessReturn: (payload: { cashier_id: number; items: Array<{ product_id: number; qty: number; return_price: number }>; note?: string }) => Promise<{ ok: boolean; data?: { return_id: number }; error?: string }>;
  onListReturns: (limit?: number) => Promise<{ ok: boolean; data?: ReturnRow[]; error?: string }>;
};

export function ReturnsTab({ cashierId, onSearchProducts, onResolveBarcodeVariants, onProcessReturn, onListReturns }: ReturnsTabProps) {
  const { t } = useTranslation();
  const [scannerInput, setScannerInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<Product[] | null>(null);
  const [returnCart, setReturnCart] = useState<ReturnCartItem[]>([]);
  const [note, setNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentReturns, setRecentReturns] = useState<ReturnRow[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannerRef = useRef<HTMLInputElement>(null);

  const loadRecentReturns = useCallback(async () => {
    const result = await onListReturns(20);
    if (result.ok && result.data) {
      setRecentReturns(result.data);
    }
  }, [onListReturns]);

  useEffect(() => {
    void loadRecentReturns();
  }, [loadRecentReturns]);

  function addProductToCart(product: Product) {
    setReturnCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) => item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, {
        product_id: product.id,
        barcode_id: product.barcode_id,
        name: product.name,
        qty: 1,
        return_price: product.sell_price,
      }];
    });
    setScannerInput("");
    setSearchText("");
    setSearchSuggestions(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    scannerRef.current?.focus();
  }

  async function handleScannerEnter() {
    const code = scannerInput.trim();
    if (!code) return;

    if (onResolveBarcodeVariants) {
      const variants = await onResolveBarcodeVariants(code);
      if (variants.length === 1) {
        addProductToCart(variants[0]);
        return;
      }
      if (variants.length > 1) {
        addProductToCart(variants[0]);
        return;
      }
    }

    if (onSearchProducts) {
      const results = await onSearchProducts(code, 1);
      if (results.length > 0) {
        addProductToCart(results[0]);
        return;
      }
    }

    setErrorMessage(`No product found for: ${code}`);
    setScannerInput("");
  }

  function handleSearchInput(value: string) {
    setSearchText(value);
    setSearchSuggestions(null);

    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim() || !onSearchProducts) return;

    searchTimer.current = setTimeout(async () => {
      const results = await onSearchProducts(value, 10);
      setSearchSuggestions(results);
    }, 200);
  }

  function updateQty(product_id: number, value: string) {
    const qty = Math.floor(parseFloat(value));
    if (!Number.isFinite(qty) || qty <= 0) return;
    setReturnCart((prev) => prev.map((item) => item.product_id === product_id ? { ...item, qty } : item));
  }

  function updatePrice(product_id: number, value: string) {
    const price = parseFloat(value);
    if (!Number.isFinite(price) || price < 0) return;
    setReturnCart((prev) => prev.map((item) => item.product_id === product_id ? { ...item, return_price: price } : item));
  }

  function removeFromCart(product_id: number) {
    setReturnCart((prev) => prev.filter((item) => item.product_id !== product_id));
  }

  async function handleProcessReturn() {
    if (returnCart.length === 0) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const result = await onProcessReturn({
      cashier_id: cashierId,
      items: returnCart.map((item) => ({
        product_id: item.product_id,
        qty: item.qty,
        return_price: item.return_price,
      })),
      note: note.trim() || undefined,
    });

    setIsProcessing(false);

    if (result.ok && result.data) {
      setSuccessMessage(t("returns.success", { id: result.data.return_id }));
      setReturnCart([]);
      setNote("");
      void loadRecentReturns();
    } else {
      setErrorMessage(result.error ?? "Failed to process return.");
    }
  }

  return (
    <section className="space-y-4">
      <ToolbarCard
        title={t("returns.title")}
        description={t("tabs.returns.subtitle")}
        actions={
          <button type="button" onClick={() => void loadRecentReturns()}>
            {t("actions.refreshReturns")}
          </button>
        }
      />

      {/* Scan / Search Card */}
      <SurfaceCard title={t("returns.scanOrSearch")}>
        <div className="space-y-4">
          {/* Scanner + Search — same row */}
          <div className="grid grid-cols-2 gap-3">
            <label className="m-0 text-sm font-medium text-foreground">
              {t("billing.productId")}
              <input
                ref={scannerRef}
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={t("billing.scanPlaceholder")}
                value={scannerInput}
                onChange={(e) => setScannerInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleScannerEnter(); }}
              />
            </label>

            <label className="m-0 text-sm font-medium text-foreground">
              {t("billing.productName")}
              <div className="relative">
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={t("billing.searchPlaceholder")}
                  value={searchText}
                  onChange={(e) => handleSearchInput(e.target.value)}
                />
                {searchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-slate-600 bg-slate-900 text-slate-100">
                    {searchSuggestions.map((p) => (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        className="flex w-full flex-col items-start gap-0.5 border-0 border-b border-slate-700 bg-slate-900 px-3 py-2 text-left text-[15px] text-slate-100 hover:bg-slate-800 focus:bg-slate-800"
                        onMouseDown={(e) => { e.preventDefault(); addProductToCart(p); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addProductToCart(p); } }}
                      >
                        <span className="font-semibold text-slate-100">{p.name}</span>
                        <span className="text-sm text-slate-300">
                          {p.barcode_id} | Rs. {Number(p.sell_price).toFixed(2)} | Stock {Number(p.stock).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Error / Success messages */}
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          {successMessage && <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>}

          {/* Return cart */}
          {returnCart.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("returns.emptyCart")}</p>
          ) : (
            <div className="space-y-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-4">{t("returns.name")}</th>
                    <th className="pb-2 pr-4 w-24">{t("returns.qty")}</th>
                    <th className="pb-2 pr-4 w-28">{t("returns.returnPrice")}</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {returnCart.map((item) => (
                    <tr key={item.product_id} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{item.barcode_id}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          defaultValue={item.qty}
                          onBlur={(e) => updateQty(item.product_id, e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 w-24 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          defaultValue={item.return_price}
                          onBlur={(e) => updatePrice(item.product_id, e.target.value)}
                        />
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(item.product_id)}
                          aria-label={t("returns.remove")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Note */}
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={t("returns.note")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              {/* Process button */}
              <button
                type="button"
                disabled={returnCart.length === 0 || isProcessing}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                onClick={() => void handleProcessReturn()}
              >
                {isProcessing ? "..." : t("returns.processReturn")}
              </button>
            </div>
          )}
        </div>
      </SurfaceCard>

      {/* Recent Returns Card */}
      <SurfaceCard title={t("returns.recentReturns")} contentClassName="p-0">
        {recentReturns.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("returns.emptyReturns")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">{t("returns.date")}</th>
                <th className="px-4 py-2">{t("returns.cashier")}</th>
                <th className="px-4 py-2">{t("returns.items")}</th>
                <th className="px-4 py-2">{t("returns.name")}</th>
                <th className="px-4 py-2 text-right">{t("held.total")}</th>
                <th className="px-4 py-2">{t("returns.note")}</th>
              </tr>
            </thead>
            <tbody>
              {recentReturns.map((r) => (
                <tr key={r.id} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground">{r.id}</td>
                  <td className="px-4 py-2 tabular-nums">{r.timestamp}</td>
                  <td className="px-4 py-2">{r.cashier ?? "—"}</td>
                  <td className="px-4 py-2 text-center">{r.item_count}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.item_names ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">Rs. {Number(r.return_total).toFixed(2)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SurfaceCard>
    </section>
  );
}
