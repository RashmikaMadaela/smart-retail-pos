/** @vitest-environment jsdom */
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
        isSuperAdmin={false}
        onClearInventory={vi.fn()}
        onExportInventory={vi.fn()}
        onImportInventory={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Search ID or product name"), {
      target: { value: "yog" },
    });

    expect(screen.getByText("Yogurt")).toBeTruthy();
    expect(screen.queryByText("Milk")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Refresh Products" }));
    expect(onRefreshProducts).toHaveBeenCalledTimes(1);
  });
});
