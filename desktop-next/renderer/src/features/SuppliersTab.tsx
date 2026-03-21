import { useEffect, useMemo, useState } from "react";
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

  const matchedProduct = useMemo(() => {
    const barcode = (batchLineDraft.product_id || "").trim().toLowerCase();
    if (!barcode) {
      return null;
    }
    return products.find((product) => product.barcode_id.trim().toLowerCase() === barcode) || null;
  }, [products, batchLineDraft.product_id]);

  const productNameSuggestions = useMemo(() => {
    const needle = (batchLineDraft.new_item_name || "").trim().toLowerCase();
    if (!needle) {
      return products.slice(0, 12);
    }
    return products
      .filter((product) => product.name.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [products, batchLineDraft.new_item_name]);

  useEffect(() => {
    if (!matchedProduct) {
      return;
    }

    const buyPrice = String(Number(matchedProduct.buy_price || 0));
    const sellPrice = String(Number(matchedProduct.sell_price || 0));
    const discPct = String(Number(matchedProduct.default_discount_pct || 0));
    const surchargePct = String(
      Number(matchedProduct.card_surcharge_enabled || 0) > 0 ? Number(matchedProduct.card_surcharge_pct || 0) : 0,
    );

    const nextDraft: BatchLineDraft = {
      ...batchLineDraft,
      create_new_item: false,
      new_item_name: matchedProduct.name || "",
      new_item_buy_price: buyPrice,
      new_item_sell_price: sellPrice,
      new_item_default_discount_pct: discPct,
      new_item_card_surcharge_enabled: Number(matchedProduct.card_surcharge_enabled || 0) > 0,
      new_item_card_surcharge_pct: surchargePct,
      unit_cost: batchLineDraft.unit_cost || buyPrice,
      line_discount_pct: batchLineDraft.line_discount_pct || discPct,
    };

    const isSame =
      nextDraft.new_item_name === (batchLineDraft.new_item_name || "") &&
      nextDraft.new_item_buy_price === (batchLineDraft.new_item_buy_price || "") &&
      nextDraft.new_item_sell_price === (batchLineDraft.new_item_sell_price || "") &&
      nextDraft.new_item_default_discount_pct === (batchLineDraft.new_item_default_discount_pct || "") &&
      nextDraft.new_item_card_surcharge_enabled === Boolean(batchLineDraft.new_item_card_surcharge_enabled) &&
      nextDraft.new_item_card_surcharge_pct === (batchLineDraft.new_item_card_surcharge_pct || "") &&
      nextDraft.unit_cost === batchLineDraft.unit_cost &&
      nextDraft.line_discount_pct === batchLineDraft.line_discount_pct &&
      nextDraft.create_new_item === Boolean(batchLineDraft.create_new_item);

    if (!isSame) {
      onBatchLineDraftChange(nextDraft);
    }
  }, [matchedProduct, batchLineDraft, onBatchLineDraftChange]);

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
              onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, line_discount_pct: e.target.value, new_item_default_discount_pct: e.target.value })}
            />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("suppliers.cardSurcharge")}
            <input
              className="no-spinner"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={batchLineDraft.new_item_card_surcharge_pct || ""}
              onChange={(e) =>
                onBatchLineDraftChange({
                  ...batchLineDraft,
                  new_item_card_surcharge_pct: e.target.value,
                  new_item_card_surcharge_enabled: Number(e.target.value || "0") > 0,
                  create_new_item: !matchedProduct,
                })
              }
            />
          </label>
          <button type="button" onClick={onAddBatchLine}>
            {t("suppliers.addLine")}
          </button>
        </div>

        <h4 className="mb-0 mt-4 text-base font-semibold text-foreground">{t("suppliers.batchLines")}</h4>
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
                <th>{t("suppliers.cardSurcharge")}</th>
                <th>{t("suppliers.lineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {batchLines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {t("suppliers.noBatchLines")}
                  </td>
                </tr>
              ) : (
                batchLines.map((line, index) => {
                  const qty = Number(line.qty_received || 0);
                  const buy = Number(line.unit_cost || line.new_item_buy_price || 0);
                  const disc = Number(line.line_discount_pct || 0);
                  const base = qty * buy;
                  const total = Number((base - base * (disc / 100)).toFixed(2));
                  return (
                    <tr key={`${line.product_id || "auto"}-${index}`}>
                      <td>{line.product_id || "(auto)"}</td>
                      <td>{line.new_item_name || "-"}</td>
                      <td>{qty.toFixed(2)}</td>
                      <td>{buy.toFixed(2)}</td>
                      <td>{Number(line.new_item_sell_price || 0).toFixed(2)}</td>
                      <td>{disc.toFixed(2)}</td>
                      <td>{Number(line.new_item_card_surcharge_pct || 0).toFixed(2)}</td>
                      <td>{total.toFixed(2)}</td>
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
