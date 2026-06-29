import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BatchLineDraft, Product, Supplier, SupplierLedger } from "./types";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";

type SuppliersTabProps = {
  products: Product[];
  supplierName: string;
  supplierContact: string;
  suppliers: Supplier[];
  selectedSupplierId: number | null;
  batchReference: string;
  batchPaid: string;
  batchLineDraft: BatchLineDraft;
  batchLines: BatchLineDraft[];
  selectedSupplierBatchId: number | null;
  supplierPayAmount: string;
  supplierPayMethod: string;
  supplierPayNote: string;
  supplierLedger: SupplierLedger | null;
  onSearchProducts?: (searchText: string, limit?: number) => Promise<Product[]>;
  onRefreshSuppliers: () => void;
  onSupplierNameChange: (value: string) => void;
  onSupplierContactChange: (value: string) => void;
  onCreateSupplier: () => void;
  onUpdateSupplier: (payload: { supplier_id: number; name: string; contact?: string }) => void | Promise<void>;
  onSelectSupplier: (supplierId: number) => void;
  onBatchReferenceChange: (value: string) => void;
  onBatchPaidChange: (value: string) => void;
  onBatchLineDraftChange: (draft: BatchLineDraft) => void;
  onAddBatchLine: () => void;
  onClearBatchLines?: () => void;
  onRemoveBatchLine?: (index: number) => void;
  onReceiveSupplierBatch: () => void;
  onSelectSupplierBatch: (batchId: number) => void;
  onSupplierPayAmountChange: (value: string) => void;
  onSupplierPayMethodChange: (value: string) => void;
  onSupplierPayNoteChange: (value: string) => void;
  onApplySupplierPayment: () => void;
};

export function SuppliersTab({
  products,
  supplierName,
  supplierContact,
  suppliers,
  selectedSupplierId,
  batchReference,
  batchPaid,
  batchLineDraft,
  batchLines,
  selectedSupplierBatchId,
  supplierPayAmount,
  supplierPayMethod,
  supplierPayNote,
  supplierLedger,
  onSearchProducts,
  onRefreshSuppliers,
  onSupplierNameChange,
  onSupplierContactChange,
  onCreateSupplier,
  onUpdateSupplier,
  onSelectSupplier,
  onBatchReferenceChange,
  onBatchPaidChange,
  onBatchLineDraftChange,
  onAddBatchLine,
  onClearBatchLines,
  onRemoveBatchLine,
  onReceiveSupplierBatch,
  onSelectSupplierBatch,
  onSupplierPayAmountChange,
  onSupplierPayMethodChange,
  onSupplierPayNoteChange,
  onApplySupplierPayment,
}: SuppliersTabProps) {
  const { t } = useTranslation();
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editSupplierContact, setEditSupplierContact] = useState("");
  const [remoteMatchedProduct, setRemoteMatchedProduct] = useState<Product | null>(null);
  const [remoteBarcodeVariants, setRemoteBarcodeVariants] = useState<Product[]>([]);
  const [remoteProductSuggestions, setRemoteProductSuggestions] = useState<Product[] | null>(null);
  const [priceMismatchModalOpen, setPriceMismatchModalOpen] = useState(false);
  const [selectedMismatchVariantId, setSelectedMismatchVariantId] = useState<number | null>(null);
  const lastMatchedProductIdRef = useRef<number | null>(null);
  const updateSelectedButtonRef = useRef<HTMLButtonElement | null>(null);

  const matchedProduct = useMemo(() => {
    const barcode = (batchLineDraft.product_id || "").trim().toLowerCase();
    if (!barcode) {
      return null;
    }
    return products.find((product) => product.barcode_id.trim().toLowerCase() === barcode) || remoteMatchedProduct || null;
  }, [products, batchLineDraft.product_id, remoteMatchedProduct]);

  const barcodeVariants = useMemo(() => {
    const barcode = (batchLineDraft.product_id || "").trim().toLowerCase();
    if (!barcode) {
      return [];
    }
    const all = [...products, ...remoteBarcodeVariants]
      .filter((product) => product.barcode_id.trim().toLowerCase() === barcode)
      .sort((a, b) => Number(a.sell_price || 0) - Number(b.sell_price || 0));
    const byId = new Map<number, Product>();
    for (const row of all) {
      byId.set(Number(row.id), row);
    }
    return Array.from(byId.values());
  }, [products, remoteBarcodeVariants, batchLineDraft.product_id]);

  const productNameSuggestions = useMemo(() => {
    if (remoteProductSuggestions) {
      return remoteProductSuggestions;
    }
    const needle = (batchLineDraft.new_item_name || "").trim().toLowerCase();
    if (!needle) {
      return products.slice(0, 12);
    }
    return products
      .filter((product) => product.name.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [products, batchLineDraft.new_item_name, remoteProductSuggestions]);

  useEffect(() => {
    const barcode = (batchLineDraft.product_id || "").trim();
    if (!barcode || !onSearchProducts) {
      setRemoteMatchedProduct(null);
      setRemoteBarcodeVariants([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const rows = await onSearchProducts(barcode, 12);
        if (cancelled) {
          return;
        }
        const exactRows = rows.filter((product) => product.barcode_id.trim().toLowerCase() === barcode.toLowerCase());
        const exact = exactRows[0];
        setRemoteBarcodeVariants(exactRows);
        setRemoteMatchedProduct(exact || null);
      })();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [batchLineDraft.product_id, onSearchProducts]);

  useEffect(() => {
    const needle = (batchLineDraft.new_item_name || "").trim();
    if (!needle || !onSearchProducts) {
      setRemoteProductSuggestions(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const rows = await onSearchProducts(needle, 12);
        if (!cancelled) {
          setRemoteProductSuggestions(rows);
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [batchLineDraft.new_item_name, onSearchProducts]);

  useEffect(() => {
    if (!matchedProduct) {
      lastMatchedProductIdRef.current = null;
      return;
    }

    const matchedId = Number(matchedProduct.id || 0);
    if (!Number.isFinite(matchedId) || matchedId <= 0) {
      return;
    }

    if (lastMatchedProductIdRef.current === matchedId) {
      return;
    }
    lastMatchedProductIdRef.current = matchedId;

    const buyPrice = String(Number(matchedProduct.buy_price || 0));
    const sellPrice = String(Number(matchedProduct.sell_price || 0));
    const discPctNum = Number(matchedProduct.default_discount_pct || 0);
    const discPct = String(discPctNum);
    const discAmt = String(Number(((Number(sellPrice || 0) * discPctNum) / 100).toFixed(2)));

    const nextDraft: BatchLineDraft = {
      ...batchLineDraft,
      create_new_item: false,
      matched_product_id: matchedId,
      resolution_mode: "update-existing",
      new_item_name: matchedProduct.name || "",
      new_item_buy_price: buyPrice,
      new_item_sell_price: sellPrice,
      new_item_default_discount_pct: discPct,
      unit_cost: buyPrice,
      line_discount_pct: discPct,
      line_discount_amt: discAmt,
    };

    onBatchLineDraftChange(nextDraft);
  }, [matchedProduct, batchLineDraft, onBatchLineDraftChange]);

  useEffect(() => {
    if (!priceMismatchModalOpen) {
      setSelectedMismatchVariantId(null);
      return;
    }
    const incomingSell = Number(batchLineDraft.new_item_sell_price || 0);
    const nearest = barcodeVariants.reduce<Product | null>((best, current) => {
      if (!best) {
        return current;
      }
      const bestGap = Math.abs(Number(best.sell_price || 0) - incomingSell);
      const currentGap = Math.abs(Number(current.sell_price || 0) - incomingSell);
      return currentGap < bestGap ? current : best;
    }, barcodeVariants[0] || matchedProduct || null);
    setSelectedMismatchVariantId(nearest ? Number(nearest.id) : null);
    const timer = window.setTimeout(() => {
      updateSelectedButtonRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [priceMismatchModalOpen, matchedProduct, barcodeVariants, batchLineDraft.new_item_sell_price]);

  function handleAddLineClick() {
    if (!matchedProduct) {
      onAddBatchLine();
      return;
    }

    const incomingSell = Number(batchLineDraft.new_item_sell_price || matchedProduct.sell_price || 0);
    const currentSell = Number(matchedProduct.sell_price || 0);
    if (Number.isFinite(incomingSell) && Number.isFinite(currentSell) && Math.abs(incomingSell - currentSell) >= 0.01) {
      setPriceMismatchModalOpen(true);
      return;
    }

    onBatchLineDraftChange({
      ...batchLineDraft,
      matched_product_id: Number(matchedProduct.id),
      resolution_mode: "update-existing",
    });
    onAddBatchLine();
  }

  return (
    <section className="space-y-4">
      <ToolbarCard
        title={t("suppliers.title")}
        description={t("suppliers.description")}
        actions={
          <button type="button" onClick={onRefreshSuppliers}>
            {t("suppliers.refresh")}
          </button>
        }
      />

      <SurfaceCard title={t("suppliers.createSupplier")}>
        <div className="grid gap-2 md:grid-cols-[1.3fr_1fr_auto] md:items-end">
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.supplierName")}
            <input value={supplierName} onChange={(e) => onSupplierNameChange(e.target.value)} />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.contact")}
            <input value={supplierContact} onChange={(e) => onSupplierContactChange(e.target.value)} />
          </label>
          <button type="button" onClick={onCreateSupplier}>
            {t("suppliers.createSupplier")}
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard title={t("suppliers.suppliers")} className="overflow-hidden" contentClassName="p-0">
        <table className="m-0">
          <thead>
            <tr>
              <th>{t("suppliers.select")}</th>
              <th>{t("suppliers.name")}</th>
              <th>{t("suppliers.contact")}</th>
              <th>{t("suppliers.outstanding")}</th>
              <th>{t("suppliers.action")}</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  {t("suppliers.noSuppliers")}
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <input
                      type="radio"
                      className="h-5 w-5 accent-cyan-300"
                      checked={selectedSupplierId === supplier.id}
                      onChange={() => onSelectSupplier(supplier.id)}
                    />
                  </td>
                  <td>
                    {editingSupplierId === supplier.id ? (
                      <input value={editSupplierName} onChange={(e) => setEditSupplierName(e.target.value)} />
                    ) : (
                      supplier.name
                    )}
                  </td>
                  <td>
                    {editingSupplierId === supplier.id ? (
                      <input value={editSupplierContact} onChange={(e) => setEditSupplierContact(e.target.value)} />
                    ) : (
                      supplier.contact || "-"
                    )}
                  </td>
                  <td>{Number(supplier.total_outstanding).toFixed(2)}</td>
                  <td>
                    {editingSupplierId === supplier.id ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            void onUpdateSupplier({
                              supplier_id: supplier.id,
                              name: editSupplierName,
                              contact: editSupplierContact,
                            });
                            setEditingSupplierId(null);
                          }}
                        >
                          {t("suppliers.save")}
                        </button>
                        <button type="button" className="px-2 py-1 text-xs !bg-slate-600 !text-white" onClick={() => setEditingSupplierId(null)}>
                          {t("suppliers.cancel")}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="px-2 py-1 text-xs"
                        onClick={() => {
                          setEditingSupplierId(supplier.id);
                          setEditSupplierName(supplier.name);
                          setEditSupplierContact(supplier.contact || "");
                        }}
                      >
                        {t("suppliers.edit")}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SurfaceCard>

      <SurfaceCard title={t("suppliers.receiveBatch")} subtitle={t("suppliers.receiveBatchSubtitle")}>
        {matchedProduct ? <p className="mb-2 mt-0 text-xs text-sky-200">{t("suppliers.barcodeMatched")}</p> : null}
        <div className="grid gap-2 xl:grid-cols-[1.1fr_1.6fr_0.8fr_1fr_1fr_0.8fr_1fr_auto]">
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.barcodeOptional")}
            <input
              value={batchLineDraft.product_id}
              onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, product_id: e.target.value })}
            />
          </label>
          <div className="relative">
            <label className="m-0 block text-sm font-medium text-foreground">
              {t("suppliers.productName")}
              <input
                value={batchLineDraft.new_item_name || ""}
                onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, new_item_name: e.target.value, create_new_item: true })}
              />
            </label>
            {(batchLineDraft.new_item_name || "").trim() ? (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-slate-600 bg-slate-900 text-slate-100">
                {productNameSuggestions.length === 0 ? (
                  <p className="m-0 px-3 py-2 text-sm text-slate-300">{t("suppliers.noMatching")}</p>
                ) : (
                  productNameSuggestions.map((product) => (
                    <div
                      key={product.barcode_id}
                      role="button"
                      tabIndex={0}
                      className="flex w-full flex-col items-start gap-0.5 border-0 border-b border-slate-700 bg-slate-900 px-3 py-2 text-left text-[15px] text-slate-100 hover:bg-slate-800 focus:bg-slate-800"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onBatchLineDraftChange({
                          ...batchLineDraft,
                          product_id: product.barcode_id,
                          new_item_name: product.name,
                          create_new_item: false,
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onBatchLineDraftChange({
                            ...batchLineDraft,
                            product_id: product.barcode_id,
                            new_item_name: product.name,
                            create_new_item: false,
                          });
                        }
                      }}
                    >
                      <span className="font-semibold text-slate-100">{product.name}</span>
                      <span className="text-sm text-slate-300">
                        {product.barcode_id} | {t("suppliers.sell")} {Number(product.sell_price).toFixed(2)} | {t("suppliers.stock")} {Number(product.stock).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.qty")}
            <input
              className="no-spinner"
              type="number"
              min="0"
              step="0.01"
              value={batchLineDraft.qty_received}
              onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, qty_received: e.target.value })}
            />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.buyPrice")}
            <input
              className="no-spinner"
              type="number"
              min="0"
              step="0.01"
              value={batchLineDraft.new_item_buy_price || batchLineDraft.unit_cost || ""}
              onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, unit_cost: e.target.value, new_item_buy_price: e.target.value, create_new_item: !matchedProduct })}
            />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.sellPrice")}
            <input
              className="no-spinner"
              type="number"
              min="0"
              step="0.01"
              value={batchLineDraft.new_item_sell_price || ""}
              onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, new_item_sell_price: e.target.value, create_new_item: !matchedProduct })}
            />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.discPct")}
            <input
              className="no-spinner"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={batchLineDraft.line_discount_pct}
              onChange={(e) => {
                const pct = e.target.value;
                onBatchLineDraftChange({
                  ...batchLineDraft,
                  line_discount_pct: pct,
                  new_item_default_discount_pct: pct,
                  line_discount_amt: String(
                    Number(batchLineDraft.new_item_sell_price || 0) > 0
                      ? Number(((Number(batchLineDraft.new_item_sell_price || 0) * Number(pct || 0)) / 100).toFixed(2))
                      : 0
                  ),
                });
              }}
            />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.discAmt")}
            <input
              className="no-spinner"
              type="number"
              min="0"
              step="0.01"
              value={batchLineDraft.line_discount_amt || "0"}
              disabled={!batchLineDraft.new_item_sell_price || Number(batchLineDraft.new_item_sell_price) === 0}
              onChange={(e) => {
                const amt = e.target.value;
                const price = Number(batchLineDraft.new_item_sell_price || 0);
                const pct = price > 0 ? String(Number(((Number(amt || 0) / price) * 100).toFixed(2))) : "0";
                onBatchLineDraftChange({
                  ...batchLineDraft,
                  line_discount_amt: amt,
                  line_discount_pct: pct,
                  new_item_default_discount_pct: pct,
                });
              }}
            />
          </label>
          <button type="button" onClick={handleAddLineClick}>
            {t("suppliers.addLine")}
          </button>
        </div>

        {priceMismatchModalOpen && matchedProduct ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Price mismatch decision"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setPriceMismatchModalOpen(false);
                setSelectedMismatchVariantId(null);
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (barcodeVariants.length === 0) {
                  return;
                }
                const currentIndex = Math.max(0, barcodeVariants.findIndex((row) => Number(row.id) === Number(selectedMismatchVariantId || 0)));
                const next = barcodeVariants[(currentIndex + 1) % barcodeVariants.length];
                setSelectedMismatchVariantId(Number(next.id));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                if (barcodeVariants.length === 0) {
                  return;
                }
                const currentIndex = Math.max(0, barcodeVariants.findIndex((row) => Number(row.id) === Number(selectedMismatchVariantId || 0)));
                const next = barcodeVariants[(currentIndex - 1 + barcodeVariants.length) % barcodeVariants.length];
                setSelectedMismatchVariantId(Number(next.id));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                onBatchLineDraftChange({
                  ...batchLineDraft,
                  matched_product_id: Number(selectedMismatchVariantId || matchedProduct.id),
                  resolution_mode: "update-existing",
                });
                setPriceMismatchModalOpen(false);
                onAddBatchLine();
              }
            }}
          >
            <div className="w-full max-w-3xl rounded-2xl border border-border/80 bg-card p-5 shadow-panel">
              <h4 className="m-0 text-lg font-semibold text-foreground">{t("suppliers.priceMismatchTitle")}</h4>
              <p className="mb-3 mt-2 text-sm text-muted-foreground">
                {t("suppliers.priceMismatchDescription", {
                  barcode: matchedProduct.barcode_id,
                  existingSell: Number(matchedProduct.sell_price).toFixed(2),
                  incomingSell: Number(batchLineDraft.new_item_sell_price || 0).toFixed(2),
                })}
              </p>
              <p className="mb-3 mt-0 text-xs text-muted-foreground">{t("suppliers.priceMismatchHint")}</p>
              <div className="max-h-72 overflow-auto rounded-xl border border-border/80 bg-background/40">
                <table className="m-0">
                  <thead>
                    <tr>
                      <th>{t("suppliers.id")}</th>
                      <th>{t("suppliers.productName")}</th>
                      <th>{t("suppliers.buyPrice")}</th>
                      <th>{t("suppliers.sellPrice")}</th>
                      <th>{t("suppliers.stock")}</th>
                      <th>{t("suppliers.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barcodeVariants.map((variant) => (
                      <tr
                        key={`${variant.barcode_id}-${variant.id}`}
                        className={Number(selectedMismatchVariantId) === Number(variant.id) ? "bg-cyan-950/35" : undefined}
                        onClick={() => setSelectedMismatchVariantId(Number(variant.id))}
                      >
                        <td>{variant.id}</td>
                        <td>{variant.name}</td>
                        <td>{Number(variant.buy_price || 0).toFixed(2)}</td>
                        <td>{Number(variant.sell_price || 0).toFixed(2)}</td>
                        <td>{Number(variant.stock || 0).toFixed(2)}</td>
                        <td>
                          <button
                            type="button"
                            className="px-2 py-1 text-xs"
                            onClick={() => {
                              onBatchLineDraftChange({
                                ...batchLineDraft,
                                matched_product_id: Number(variant.id),
                                resolution_mode: "update-existing",
                              });
                              setPriceMismatchModalOpen(false);
                              onAddBatchLine();
                            }}
                          >
                            {t("suppliers.updateSelectedVariant")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  ref={updateSelectedButtonRef}
                  type="button"
                  className="!bg-amber-500 !text-slate-900"
                  onClick={() => {
                    onBatchLineDraftChange({
                      ...batchLineDraft,
                      matched_product_id: Number(matchedProduct.id),
                      resolution_mode: "create-variant",
                      create_new_item: true,
                    });
                    setPriceMismatchModalOpen(false);
                    onAddBatchLine();
                  }}
                >
                  {t("suppliers.createNewPriceVariant")}
                </button>
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" className="!bg-slate-600 !text-white" onClick={() => setPriceMismatchModalOpen(false)}>
                  {t("suppliers.cancel")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <h4 className="m-0 text-base font-semibold text-foreground">{t("suppliers.batchLines")}</h4>
          <button
            type="button"
            className="!bg-slate-600 !text-white"
            disabled={batchLines.length === 0 || !onClearBatchLines}
            onClick={() => onClearBatchLines?.()}
          >
            {t("suppliers.clearBatchLines")}
          </button>
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-border/80 bg-card/40">
          <table className="m-0">
            <thead>
              <tr>
                <th>{t("suppliers.barcode")}</th>
                <th>{t("suppliers.productName")}</th>
                <th>{t("suppliers.qty")}</th>
                <th>{t("suppliers.buyPrice")}</th>
                <th>{t("suppliers.sellPrice")}</th>
                <th>{t("suppliers.discPct")}</th>
                <th>{t("suppliers.discAmt")}</th>
                <th>{t("suppliers.lineTotal")}</th>
                <th>{t("suppliers.action")}</th>
              </tr>
            </thead>
            <tbody>
              {batchLines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    {t("suppliers.noBatchLines")}
                  </td>
                </tr>
              ) : (
                batchLines.map((line, index) => {
                  const qty = Number(line.qty_received || 0);
                  const buy = Number(line.unit_cost || line.new_item_buy_price || 0);
                  const sell = Number(line.new_item_sell_price || 0);
                  const disc = Number(line.line_discount_pct || 0);
                  const discAmt = Number(line.line_discount_amt || ((sell * disc) / 100));
                  const base = qty * buy;
                  const total = Number((base - base * (disc / 100)).toFixed(2));
                  return (
                    <tr key={`${line.product_id || "auto"}-${index}`}>
                      <td>{line.product_id || "(auto)"}</td>
                      <td>{line.new_item_name || "-"}</td>
                      <td>{qty.toFixed(2)}</td>
                      <td>{buy.toFixed(2)}</td>
                      <td>{sell.toFixed(2)}</td>
                      <td>{disc.toFixed(2)}</td>
                      <td>{discAmt.toFixed(2)}</td>
                      <td>{total.toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          className="danger px-2 py-1 text-xs"
                          onClick={() => onRemoveBatchLine?.(index)}
                        >
                          {t("suppliers.removeLine")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_1fr_auto] md:items-end">
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.invoiceNo")}
            <input value={batchReference} onChange={(e) => onBatchReferenceChange(e.target.value)} />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.amountPaid")}
            <input className="no-spinner" value={batchPaid} onChange={(e) => onBatchPaidChange(e.target.value)} />
          </label>
          <button type="button" onClick={onReceiveSupplierBatch}>
            {t("suppliers.receiveStock")}
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard title={t("suppliers.settleBatch")}>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-end">
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.payAmount")}
            <input value={supplierPayAmount} onChange={(e) => onSupplierPayAmountChange(e.target.value)} />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.method")}
            <select value={supplierPayMethod} onChange={(e) => onSupplierPayMethodChange(e.target.value)}>
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
              <option value="BANK">BANK</option>
            </select>
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.note")}
            <input value={supplierPayNote} onChange={(e) => onSupplierPayNoteChange(e.target.value)} />
          </label>
          <button type="button" onClick={onApplySupplierPayment}>
            {t("suppliers.recordSupplierPayment")}
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard title={t("suppliers.supplierBatches")} className="overflow-hidden" contentClassName="p-0">
        <table className="m-0">
          <thead>
            <tr>
              <th>{t("suppliers.select")}</th>
              <th>{t("suppliers.id")}</th>
              <th>{t("suppliers.ref")}</th>
              <th>{t("suppliers.total")}</th>
              <th>{t("suppliers.paid")}</th>
              <th>{t("suppliers.balance")}</th>
              <th>{t("suppliers.status")}</th>
            </tr>
          </thead>
          <tbody>
            {(supplierLedger?.batches || []).length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  {t("suppliers.noBatches")}
                </td>
              </tr>
            ) : (
              (supplierLedger?.batches || []).map((batch) => (
                <tr key={batch.id}>
                  <td>
                    <input
                      type="radio"
                      className="h-5 w-5 accent-cyan-300"
                      checked={selectedSupplierBatchId === Number(batch.id)}
                      onChange={() => onSelectSupplierBatch(Number(batch.id))}
                    />
                  </td>
                  <td>{batch.id}</td>
                  <td>{batch.reference_no || "-"}</td>
                  <td>{Number(batch.total_cost).toFixed(2)}</td>
                  <td>{Number(batch.paid_amount).toFixed(2)}</td>
                  <td>{Number(batch.balance_due).toFixed(2)}</td>
                  <td>{batch.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SurfaceCard>

      <SurfaceCard title={t("suppliers.supplierPayments")} className="overflow-hidden" contentClassName="p-0">
        <table className="m-0">
          <thead>
            <tr>
              <th>{t("suppliers.id")}</th>
              <th>{t("suppliers.batch")}</th>
              <th>{t("suppliers.amount")}</th>
              <th>{t("suppliers.method")}</th>
              <th>{t("suppliers.paidAt")}</th>
            </tr>
          </thead>
          <tbody>
            {(supplierLedger?.payments || []).length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  {t("suppliers.noPayments")}
                </td>
              </tr>
            ) : (
              (supplierLedger?.payments || []).map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.id}</td>
                  <td>{payment.batch_id || "-"}</td>
                  <td>{Number(payment.amount).toFixed(2)}</td>
                  <td>{payment.method}</td>
                  <td>{payment.paid_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SurfaceCard>
    </section>
  );
}
