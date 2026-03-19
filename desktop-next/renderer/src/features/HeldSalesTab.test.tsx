/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { HeldSalesTab } from "./HeldSalesTab";

describe("HeldSalesTab", () => {
  test("supports selecting and operating on held sale", () => {
    const onSelectHeldSale = vi.fn();
    const onRecallHeldSale = vi.fn();
    const onCompleteHeldSale = vi.fn();

    render(
      <HeldSalesTab
        heldSales={[{ id: 5, timestamp: "2026-03-19 10:00", total: 1200, subtotal: 1200, discount: 0, cashier: "admin" }]}
        selectedHeldId={null}
        onRefreshHeldSales={vi.fn()}
        onSelectHeldSale={onSelectHeldSale}
        onRecallHeldSale={onRecallHeldSale}
        onCompleteHeldSale={onCompleteHeldSale}
      />,
    );

    fireEvent.click(screen.getByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "Recall to Cart" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete Selected" }));

    expect(onSelectHeldSale).toHaveBeenCalledWith(5);
    expect(onRecallHeldSale).toHaveBeenCalledTimes(1);
    expect(onCompleteHeldSale).toHaveBeenCalledTimes(1);
  });
});
