/** @vitest-environment jsdom */
import "@/i18n";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SuppliersTab } from "./SuppliersTab";

describe("SuppliersTab", () => {
  test("supports supplier create and settlement action", () => {
    const onCreateSupplier = vi.fn();
    const onApplySupplierPayment = vi.fn();

    const view = render(
      <SuppliersTab
        products={[]}
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
        onUpdateSupplier={vi.fn()}
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
        products={[]}
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
        onUpdateSupplier={vi.fn()}
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

  test("does not overwrite edited matched-product pricing fields", () => {
    const onBatchLineDraftChange = vi.fn();
    const products = [
      {
        barcode_id: "P001",
        name: "Demo Product",
        buy_price: 100,
        sell_price: 200,
        stock: 5,
        default_discount_pct: 2,
        card_surcharge_enabled: 0,
        card_surcharge_pct: 0,
      },
    ];

    const { rerender } = render(
      <SuppliersTab
        products={products}
        supplierName=""
        supplierContact=""
        suppliers={[]}
        selectedSupplierId={null}
        batchReference="INV-001"
        batchPaid="0"
        batchLineDraft={{
          product_id: "P001",
          qty_received: "2",
          unit_cost: "",
          line_discount_pct: "0",
          create_new_item: false,
          new_item_name: "",
          new_item_buy_price: "",
          new_item_sell_price: "",
          new_item_default_discount_pct: "",
          new_item_card_surcharge_enabled: false,
          new_item_card_surcharge_pct: "",
        }}
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
        onUpdateSupplier={vi.fn()}
        onSelectSupplier={vi.fn()}
        onBatchReferenceChange={vi.fn()}
        onBatchPaidChange={vi.fn()}
        onBatchLineDraftChange={onBatchLineDraftChange}
        onAddBatchLine={vi.fn()}
        onReceiveSupplierBatch={vi.fn()}
        onSelectSupplierBatch={vi.fn()}
        onSupplierPayAmountChange={vi.fn()}
        onSupplierPayMethodChange={vi.fn()}
        onSupplierPayNoteChange={vi.fn()}
        onApplySupplierPayment={vi.fn()}
      />,
    );

    expect(onBatchLineDraftChange).toHaveBeenCalledTimes(1);

    onBatchLineDraftChange.mockClear();

    rerender(
      <SuppliersTab
        products={products}
        supplierName=""
        supplierContact=""
        suppliers={[]}
        selectedSupplierId={null}
        batchReference="INV-001"
        batchPaid="0"
        batchLineDraft={{
          product_id: "P001",
          qty_received: "2",
          unit_cost: "130",
          line_discount_pct: "3",
          create_new_item: false,
          new_item_name: "Demo Product",
          new_item_buy_price: "130",
          new_item_sell_price: "260",
          new_item_default_discount_pct: "3",
          new_item_card_surcharge_enabled: false,
          new_item_card_surcharge_pct: "0",
        }}
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
        onUpdateSupplier={vi.fn()}
        onSelectSupplier={vi.fn()}
        onBatchReferenceChange={vi.fn()}
        onBatchPaidChange={vi.fn()}
        onBatchLineDraftChange={onBatchLineDraftChange}
        onAddBatchLine={vi.fn()}
        onReceiveSupplierBatch={vi.fn()}
        onSelectSupplierBatch={vi.fn()}
        onSupplierPayAmountChange={vi.fn()}
        onSupplierPayMethodChange={vi.fn()}
        onSupplierPayNoteChange={vi.fn()}
        onApplySupplierPayment={vi.fn()}
      />,
    );

    expect(onBatchLineDraftChange).not.toHaveBeenCalled();
  });
});
