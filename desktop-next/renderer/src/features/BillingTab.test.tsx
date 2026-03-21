/** @vitest-environment jsdom */
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { BillingTab } from "./BillingTab";

describe("BillingTab", () => {
  test("fires add/remove and checkout actions", () => {
    const onQuickAddProduct = vi.fn();
    const onRemoveFromCart = vi.fn();
    const onAdjustCartQty = vi.fn();
    const onProcessSale = vi.fn();

    render(
      <BillingTab
        products={[{ barcode_id: "P001", name: "Milk", sell_price: 250, stock: 10 }]}
        cart={[{ product_id: "P001", name: "Milk", qty: 1, price: 250, discount: 0 }]}
        paymentMode="PAID"
        paymentMethod="CASH"
        paidAmount=""
        customerName=""
        customerContact=""
        subTotal={250}
        lineDiscountTotal={0}
        baseTotal={250}
        cardSurchargeTotal={0}
        totalAmount={250}
        changeDue={0}
        balanceDue={0}
        onQuickAddProduct={onQuickAddProduct}
        onUpdateCartDiscount={vi.fn()}
        onAdjustCartQty={onAdjustCartQty}
        onRemoveFromCart={onRemoveFromCart}
        onPaymentModeChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onPaidAmountChange={vi.fn()}
        onCustomerNameChange={vi.fn()}
        onCustomerContactChange={vi.fn()}
        onHoldSale={vi.fn()}
        onProcessSale={onProcessSale}
      />,
    );

    fireEvent.change(screen.getByLabelText("Product ID / Barcode"), { target: { value: "P001" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    fireEvent.click(screen.getByRole("button", { name: "Print & Checkout" }));

    expect(onQuickAddProduct).toHaveBeenCalledWith("P001", 1);
    expect(onRemoveFromCart).toHaveBeenCalledWith("P001");
    expect(onAdjustCartQty).not.toHaveBeenCalled();
    expect(onProcessSale).toHaveBeenCalledTimes(1);
    expect(onProcessSale).toHaveBeenCalledWith(true);
  });
});
