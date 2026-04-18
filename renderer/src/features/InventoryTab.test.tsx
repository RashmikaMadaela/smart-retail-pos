/** @vitest-environment jsdom */
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { InventoryTab } from "./InventoryTab";

describe("InventoryTab", () => {
  test("filters list and refreshes products", () => {
    const onRefreshProducts = vi.fn();

    render(
      <InventoryTab
        products={[
          { barcode_id: "P001", name: "Milk", sell_price: 250, stock: 10 },
          { barcode_id: "P002", name: "Yogurt", sell_price: 180, stock: 3 },
        ]}
        onRefreshProducts={onRefreshProducts}
        onCreateProduct={vi.fn().mockResolvedValue({ ok: true, barcode_id: "PS-10001", action: "created" })}
        isSuperAdmin={false}
        onClearInventory={vi.fn()}
        onExportInventory={vi.fn()}
        onImportInventory={vi.fn()}
        onPickImportFile={vi.fn().mockResolvedValue(null)}
        onOpenExportFolder={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Search ID or product name"), {
      target: { value: "yog" },
    });

    expect(screen.getByText("Yogurt")).toBeTruthy();
    expect(screen.queryByText("Milk")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Refresh Products" }));
    expect(onRefreshProducts).toHaveBeenCalledTimes(1);
  });

  test("shows paginated remote results beyond preloaded products", async () => {
    const onQueryProductsPage = vi.fn().mockResolvedValue({
      items: [{ barcode_id: "P250", name: "Zebra Oil", sell_price: 999, stock: 4 }],
      total: 1,
      limit: 50,
      offset: 0,
    });

    render(
      <InventoryTab
        products={[
          { barcode_id: "P001", name: "Milk", sell_price: 250, stock: 10 },
        ]}
        onRefreshProducts={vi.fn()}
        onQueryProductsPage={onQueryProductsPage}
        onCreateProduct={vi.fn().mockResolvedValue({ ok: true, barcode_id: "PS-10001", action: "created" })}
        isSuperAdmin={false}
        onClearInventory={vi.fn()}
        onExportInventory={vi.fn()}
        onImportInventory={vi.fn()}
        onPickImportFile={vi.fn().mockResolvedValue(null)}
        onOpenExportFolder={vi.fn()}
      />,
    );

    const searchInputs = screen.getAllByLabelText("Search ID or product name");
    fireEvent.change(searchInputs[searchInputs.length - 1], {
      target: { value: "zebra" },
    });

    expect(await screen.findByText("Zebra Oil")).toBeTruthy();
    expect(onQueryProductsPage).toHaveBeenCalledWith({
      searchText: "zebra",
      lowStockOnly: false,
      limit: 50,
      offset: 0,
    });
    expect(screen.queryByText("Milk")).toBeNull();
  });

  test("navigates paginated inventory pages", async () => {
    const onQueryProductsPage = vi.fn().mockImplementation((payload: { offset?: number; limit?: number }) => {
      if ((payload.offset || 0) === 0) {
        return Promise.resolve({
          items: [{ barcode_id: "P001", name: "First Item", sell_price: 100, stock: 10 }],
          total: 60,
          limit: payload.limit ?? 50,
          offset: 0,
        });
      }
      return Promise.resolve({
        items: [{ barcode_id: "P002", name: "Second Item", sell_price: 100, stock: 10 }],
        total: 60,
        limit: payload.limit ?? 50,
        offset: payload.offset ?? 0,
      });
    });

    render(
      <InventoryTab
        products={[]}
        onRefreshProducts={vi.fn()}
        onQueryProductsPage={onQueryProductsPage}
        onCreateProduct={vi.fn().mockResolvedValue({ ok: true, barcode_id: "PS-10001", action: "created" })}
        isSuperAdmin={false}
        onClearInventory={vi.fn()}
        onExportInventory={vi.fn()}
        onImportInventory={vi.fn()}
        onPickImportFile={vi.fn().mockResolvedValue(null)}
        onOpenExportFolder={vi.fn()}
      />,
    );

    expect(await screen.findByText("First Item")).toBeTruthy();
    const pageSizeSelects = screen.getAllByLabelText("Page size");
    const pageSizeSelect = pageSizeSelects[pageSizeSelects.length - 1];
    fireEvent.change(pageSizeSelect, { target: { value: "25" } });
    const nextButtons = await screen.findAllByRole("button", { name: "Next" });
    fireEvent.click(nextButtons[nextButtons.length - 1]);
    expect(await screen.findByText("Second Item")).toBeTruthy();
  });
});
