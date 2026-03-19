/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SuppliersTab } from "./SuppliersTab";

describe("SuppliersTab", () => {
  test("supports supplier create and settlement action", () => {
    const onCreateSupplier = vi.fn();
    const onApplySupplierPayment = vi.fn();

    render(
      <SuppliersTab
        supplierName=""
        supplierContact=""
        suppliers={[{ id: 3, name: "ABC Traders", contact: "0119999999", total_outstanding: 1000 }]}
        selectedSupplierId={3}
        batchReference=""
        batchPaid=""
        batchLineDraft={{ product_id: "", qty_received: "", unit_cost: "", line_discount_pct: "0" }}
        batchLines={[]}
        selectedSupplierBatchId={null}
        supplierPayAmount="500"
        supplierPayMethod="CASH"
        supplierPayNote=""
        supplierLedger={{ supplier: null, batches: [], payments: [] }}
        onRefreshSuppliers={vi.fn()}
        onSupplierNameChange={vi.fn()}
        onSupplierContactChange={vi.fn()}
        onCreateSupplier={onCreateSupplier}
        onSelectSupplier={vi.fn()}
        onBatchReferenceChange={vi.fn()}
        onBatchPaidChange={vi.fn()}
        onBatchLineDraftChange={vi.fn()}
        onAddBatchLine={vi.fn()}
        onReceiveSupplierBatch={vi.fn()}
        onSelectSupplierBatch={vi.fn()}
        onSupplierPayAmountChange={vi.fn()}
        onSupplierPayMethodChange={vi.fn()}
        onSupplierPayNoteChange={vi.fn()}
        onApplySupplierPayment={onApplySupplierPayment}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Supplier" }));
    fireEvent.click(screen.getByRole("button", { name: "Record Supplier Payment" }));

    expect(onCreateSupplier).toHaveBeenCalledTimes(1);
    expect(onApplySupplierPayment).toHaveBeenCalledTimes(1);
  });
});
