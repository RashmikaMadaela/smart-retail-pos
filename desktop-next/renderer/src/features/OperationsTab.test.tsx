/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { OperationsTab } from "./OperationsTab";

describe("OperationsTab", () => {
  test("queues barcode label and records expense", () => {
    const onCreateExpense = vi.fn();

    render(
      <OperationsTab
        products={[{ barcode_id: "P001", name: "Milk", sell_price: 250, stock: 10 }]}
        expenses={[]}
        onRefreshExpenses={vi.fn()}
        onCreateExpense={onCreateExpense}
        onPrintBarcodes={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Barcode/Product ID"), { target: { value: "P001" } });
    fireEvent.change(screen.getByPlaceholderText("Qty"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to Queue" }));
    expect(screen.getByText("Milk")).toBeTruthy();

    const descriptionInput = screen.getByLabelText("Description") as HTMLInputElement;
    const amountInput = screen.getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(descriptionInput, { target: { value: "Transport" } });
    fireEvent.change(amountInput, { target: { value: "1200" } });
    fireEvent.click(screen.getByRole("button", { name: "Record Expense" }));

    expect(onCreateExpense).toHaveBeenCalledTimes(1);
    expect(onCreateExpense).toHaveBeenCalledWith({ description: "Transport", amount: 1200, category: "General" });
  });
});
