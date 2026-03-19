import { useState } from "react";
import type { BatchLineDraft, Supplier, SupplierLedger } from "./types";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";

type SuppliersTabProps = {
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
  const [receiveMode, setReceiveMode] = useState<"quick" | "bulk">("quick");

  return (
    <section className="space-y-4">
      <ToolbarCard
        title="Supplier Ledger"
        description="Receive stock, track batches, and settle payables."
        actions={
          <button type="button" onClick={onRefreshSuppliers}>
            Refresh Suppliers
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_minmax(0,1fr)]">
        <div className="space-y-4">
          <SurfaceCard title="Create Supplier">
            <label className="mt-3 block text-sm font-medium text-foreground">
              Name
              <input value={supplierName} onChange={(e) => onSupplierNameChange(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-medium text-foreground">
              Contact
              <input value={supplierContact} onChange={(e) => onSupplierContactChange(e.target.value)} />
            </label>
            <button className="mt-3" type="button" onClick={onCreateSupplier}>
              Create Supplier
            </button>
          </SurfaceCard>

          <SurfaceCard title="Suppliers" className="overflow-hidden" contentClassName="p-0">
            <table className="m-0">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No suppliers available.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <input
                          type="radio"
                          checked={selectedSupplierId === supplier.id}
                          onChange={() => onSelectSupplier(supplier.id)}
                        />
                      </td>
                      <td>{supplier.name}</td>
                      <td>{supplier.contact || "-"}</td>
                      <td>{Number(supplier.total_outstanding).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SurfaceCard>
        </div>

        <div className="space-y-4">
          <SurfaceCard title="Receive Batch" subtitle="Choose quick single-line stock receive or bulk invoice mode.">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={receiveMode === "quick" ? "!bg-cyan-400 !text-slate-900" : "!bg-slate-600 !text-slate-100"}
                onClick={() => setReceiveMode("quick")}
              >
                Quick Receive
              </button>
              <button
                type="button"
                className={receiveMode === "bulk" ? "!bg-cyan-400 !text-slate-900" : "!bg-slate-600 !text-slate-100"}
                onClick={() => setReceiveMode("bulk")}
              >
                Bulk Invoice
              </button>
            </div>

            <label className="mt-3 block text-sm font-medium text-foreground">
              Reference No
              <input value={batchReference} onChange={(e) => onBatchReferenceChange(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-medium text-foreground">
              Initial Paid
              <input value={batchPaid} onChange={(e) => onBatchPaidChange(e.target.value)} />
            </label>

            {receiveMode === "quick" ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium text-foreground">
                  Product ID
                  <input
                    placeholder="e.g. P001"
                    value={batchLineDraft.product_id}
                    onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, product_id: e.target.value })}
                  />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Quantity
                  <input
                    placeholder="Qty"
                    value={batchLineDraft.qty_received}
                    onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, qty_received: e.target.value })}
                  />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Unit Cost
                  <input
                    placeholder="Unit Cost"
                    value={batchLineDraft.unit_cost}
                    onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, unit_cost: e.target.value })}
                  />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Discount %
                  <input
                    placeholder="Disc %"
                    value={batchLineDraft.line_discount_pct}
                    onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, line_discount_pct: e.target.value })}
                  />
                </label>
              </div>
            ) : (
              <div className="batch-line mt-3">
                <input
                  placeholder="Product ID"
                  value={batchLineDraft.product_id}
                  onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, product_id: e.target.value })}
                />
                <input
                  placeholder="Qty"
                  value={batchLineDraft.qty_received}
                  onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, qty_received: e.target.value })}
                />
                <input
                  placeholder="Unit Cost"
                  value={batchLineDraft.unit_cost}
                  onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, unit_cost: e.target.value })}
                />
                <input
                  placeholder="Disc %"
                  value={batchLineDraft.line_discount_pct}
                  onChange={(e) => onBatchLineDraftChange({ ...batchLineDraft, line_discount_pct: e.target.value })}
                />
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={onAddBatchLine}>
                Add Line
              </button>
              <button type="button" onClick={onReceiveSupplierBatch}>
                Receive Stock
              </button>
            </div>

            <h4 className="mb-0 mt-4 text-base font-semibold text-foreground">Batch Lines</h4>
            <div className="mt-2 overflow-hidden rounded-xl border border-border/80 bg-card/40">
              <table className="m-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Cost</th>
                    <th>Disc%</th>
                  </tr>
                </thead>
                <tbody>
                  {batchLines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        No batch lines added.
                      </td>
                    </tr>
                  ) : (
                    batchLines.map((line, index) => (
                      <tr key={`${line.product_id}-${index}`}>
                        <td>{line.product_id}</td>
                        <td>{line.qty_received}</td>
                        <td>{line.unit_cost}</td>
                        <td>{line.line_discount_pct}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Settle Batch">
            <label className="mt-3 block text-sm font-medium text-foreground">
              Pay Amount
              <input value={supplierPayAmount} onChange={(e) => onSupplierPayAmountChange(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-medium text-foreground">
              Method
              <select value={supplierPayMethod} onChange={(e) => onSupplierPayMethodChange(e.target.value)}>
                <option value="CASH">CASH</option>
                <option value="CARD">CARD</option>
                <option value="BANK">BANK</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium text-foreground">
              Note
              <input value={supplierPayNote} onChange={(e) => onSupplierPayNoteChange(e.target.value)} />
            </label>
            <button className="mt-3" type="button" onClick={onApplySupplierPayment}>
              Record Supplier Payment
            </button>
          </SurfaceCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard title="Supplier Batches" className="overflow-hidden" contentClassName="p-0">
          <table className="m-0">
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
              {(supplierLedger?.batches || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No supplier batches.
                  </td>
                </tr>
              ) : (
                (supplierLedger?.batches || []).map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <input
                        type="radio"
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

        <SurfaceCard title="Supplier Payments" className="overflow-hidden" contentClassName="p-0">
          <table className="m-0">
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
              {(supplierLedger?.payments || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No supplier payments.
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
      </div>
    </section>
  );
}
