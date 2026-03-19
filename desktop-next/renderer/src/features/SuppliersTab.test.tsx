/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SuppliersTab } from "./SuppliersTab";

describe("SuppliersTab", () => {
  test("supports supplier create and settlement action", () => {
    const onCreateSupplier = vi.fn();
    const onApplySupplierPayment = vi.fn();

    const view = render(
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

  test("supports add line and receive stock actions", () => {
    const onAddBatchLine = vi.fn();
    const onReceiveSupplierBatch = vi.fn();

    const view = render(
      <SuppliersTab
        supplierName=""
        supplierContact=""
        suppliers={[{ id: 3, name: "ABC Traders", contact: "0119999999", total_outstanding: 1000 }]}
        selectedSupplierId={3}
        batchReference="INV-001"
        batchPaid="0"
        batchLineDraft={{ product_id: "P001", qty_received: "2", unit_cost: "100", line_discount_pct: "0" }}
        batchLines={[]}
        selectedSupplierBatchId={null}
        supplierPayAmount=""
        supplierPayMethod="CASH"
        supplierPayNote=""
        supplierLedger={{ supplier: null, batches: [], payments: [] }}
        onRefreshSuppliers={vi.fn()}
        onSupplierNameChange={vi.fn()}
        onSupplierContactChange={vi.fn()}
        onCreateSupplier={vi.fn()}
        onSelectSupplier={vi.fn()}
        onBatchReferenceChange={vi.fn()}
        onBatchPaidChange={vi.fn()}
        onBatchLineDraftChange={vi.fn()}
        onAddBatchLine={onAddBatchLine}
        onReceiveSupplierBatch={onReceiveSupplierBatch}
        onSelectSupplierBatch={vi.fn()}
        onSupplierPayAmountChange={vi.fn()}
        onSupplierPayMethodChange={vi.fn()}
        onSupplierPayNoteChange={vi.fn()}
        onApplySupplierPayment={vi.fn()}
      />,
    );

    fireEvent.click(within(view.container).getByRole("button", { name: "Add Line" }));
    fireEvent.click(within(view.container).getByRole("button", { name: "Receive Stock" }));

    expect(onAddBatchLine).toHaveBeenCalledTimes(1);
    expect(onReceiveSupplierBatch).toHaveBeenCalledTimes(1);
  });
});
