/** @vitest-environment jsdom */
import "@/i18n";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { BillingTab } from "./BillingTab";

describe("BillingTab", () => {
  test("fires add/remove and checkout actions", () => {
    const onQuickAddProduct = vi.fn();
    const onRemoveFromCart = vi.fn();
    const onAdjustCartQty = vi.fn();
    const onProcessSale = vi.fn();

    const view = render(
      <BillingTab
        products={[{ id: 1, barcode_id: "P001", name: "Milk", sell_price: 250, stock: 10 }]}
        cart={[{ product_id: 1, barcode_id: "P001", name: "Milk", qty: 1, price: 250, discount: 0 }]}
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
        customerSuggestions={[]}
        onCustomerSuggestionSelect={vi.fn()}
        onHoldSale={vi.fn()}
        onProcessSale={onProcessSale}
      />,
    );

    fireEvent.change(within(view.container).getByLabelText("Product ID / Barcode"), { target: { value: "P001" } });
    fireEvent.click(within(view.container).getByRole("button", { name: "Add to Cart" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    fireEvent.click(screen.getByRole("button", { name: "Print & Checkout" }));

    expect(onQuickAddProduct).toHaveBeenCalledWith("P001", 1, 1);
    expect(onRemoveFromCart).toHaveBeenCalledWith(1);
    expect(onAdjustCartQty).not.toHaveBeenCalled();
    expect(onProcessSale).toHaveBeenCalledTimes(1);
    expect(onProcessSale).toHaveBeenCalledWith(true);
  });

  test("supports keyboard variant selection on barcode collisions", () => {
    const onQuickAddProduct = vi.fn();

    const view = render(
      <BillingTab
        products={[
          { id: 11, barcode_id: "P001", name: "Milk Small", sell_price: 220, stock: 5 },
          { id: 12, barcode_id: "P001", name: "Milk Large", sell_price: 280, stock: 8 },
        ]}
        cart={[]}
        paymentMode="PAID"
        paymentMethod="CASH"
        paidAmount=""
        customerName=""
        customerContact=""
        subTotal={0}
        lineDiscountTotal={0}
        baseTotal={0}
        cardSurchargeTotal={0}
        totalAmount={0}
        changeDue={0}
        balanceDue={0}
        onQuickAddProduct={onQuickAddProduct}
        onUpdateCartDiscount={vi.fn()}
        onAdjustCartQty={vi.fn()}
        onRemoveFromCart={vi.fn()}
        onPaymentModeChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onPaidAmountChange={vi.fn()}
        onCustomerNameChange={vi.fn()}
        onCustomerContactChange={vi.fn()}
        customerSuggestions={[]}
        onCustomerSuggestionSelect={vi.fn()}
        onHoldSale={vi.fn()}
        onProcessSale={vi.fn()}
      />,
    );

    fireEvent.change(within(view.container).getByLabelText("Product ID / Barcode"), { target: { value: "P001" } });
    fireEvent.click(within(view.container).getByRole("button", { name: "Add to Cart" }));

    const modal = screen.getByRole("dialog", { name: "Billing variant selection" });
    fireEvent.keyDown(modal, { key: "ArrowDown" });
    fireEvent.keyDown(modal, { key: "Enter" });

    expect(onQuickAddProduct).toHaveBeenCalledWith("P001", 1, 12);
  });

  test("locks discounts and ignores line discount in UNPAID mode", () => {
    const onUpdateCartDiscount = vi.fn();

    const view = render(
      <BillingTab
        products={[{ id: 1, barcode_id: "P001", name: "Milk", sell_price: 100, stock: 10 }]}
        cart={[{ product_id: 1, barcode_id: "P001", name: "Milk", qty: 2, price: 100, discount: 20 }]}
        paymentMode="UNPAID"
        paymentMethod="CASH"
        paidAmount=""
        customerName=""
        customerContact=""
        subTotal={200}
        lineDiscountTotal={0}
        baseTotal={200}
        cardSurchargeTotal={0}
        totalAmount={200}
        changeDue={0}
        balanceDue={200}
        onQuickAddProduct={vi.fn()}
        onUpdateCartDiscount={onUpdateCartDiscount}
        onAdjustCartQty={vi.fn()}
        onRemoveFromCart={vi.fn()}
        onPaymentModeChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onPaidAmountChange={vi.fn()}
        onCustomerNameChange={vi.fn()}
        onCustomerContactChange={vi.fn()}
        customerSuggestions={[]}
        onCustomerSuggestionSelect={vi.fn()}
        onHoldSale={vi.fn()}
        onProcessSale={vi.fn()}
      />,
    );

    const row = within(view.container).getByText("Milk").closest("tr");
    expect(row).toBeTruthy();
    const scope = within(row as HTMLElement);

    const discountInputs = scope.getAllByRole("textbox");
    expect(discountInputs).toHaveLength(2);
    expect((discountInputs[0] as HTMLInputElement).disabled).toBe(true);
    expect((discountInputs[1] as HTMLInputElement).disabled).toBe(true);

    expect(scope.getByText("200.00")).toBeTruthy();
    expect(onUpdateCartDiscount).not.toHaveBeenCalled();
  });

  test("shows warning and blocks adding when stock is zero", () => {
    const onQuickAddProduct = vi.fn();

    const view = render(
      <BillingTab
        products={[{ id: 1, barcode_id: "P001", name: "Milk", sell_price: 250, stock: 0 }]}
        cart={[]}
        paymentMode="PAID"
        paymentMethod="CASH"
        paidAmount=""
        customerName=""
        customerContact=""
        subTotal={0}
        lineDiscountTotal={0}
        baseTotal={0}
        cardSurchargeTotal={0}
        totalAmount={0}
        changeDue={0}
        balanceDue={0}
        onQuickAddProduct={onQuickAddProduct}
        onUpdateCartDiscount={vi.fn()}
        onAdjustCartQty={vi.fn()}
        onRemoveFromCart={vi.fn()}
        onPaymentModeChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onPaidAmountChange={vi.fn()}
        onCustomerNameChange={vi.fn()}
        onCustomerContactChange={vi.fn()}
        customerSuggestions={[]}
        onCustomerSuggestionSelect={vi.fn()}
        onHoldSale={vi.fn()}
        onProcessSale={vi.fn()}
      />,
    );

    fireEvent.change(within(view.container).getByLabelText("Product ID / Barcode"), { target: { value: "P001" } });
    fireEvent.click(within(view.container).getByRole("button", { name: "Add to Cart" }));

    expect(within(view.container).getByRole("dialog", { name: "Stock Warning" })).toBeTruthy();
    expect(within(view.container).getByText("There is no stock. Update stock before billing.")).toBeTruthy();
    expect(onQuickAddProduct).not.toHaveBeenCalled();
  });

  test("shows warning and blocks adding when qty exceeds stock", () => {
    const onQuickAddProduct = vi.fn();

    const view = render(
      <BillingTab
        products={[{ id: 1, barcode_id: "P001", name: "Milk", sell_price: 250, stock: 2 }]}
        cart={[]}
        paymentMode="PAID"
        paymentMethod="CASH"
        paidAmount=""
        customerName=""
        customerContact=""
        subTotal={0}
        lineDiscountTotal={0}
        baseTotal={0}
        cardSurchargeTotal={0}
        totalAmount={0}
        changeDue={0}
        balanceDue={0}
        onQuickAddProduct={onQuickAddProduct}
        onUpdateCartDiscount={vi.fn()}
        onAdjustCartQty={vi.fn()}
        onRemoveFromCart={vi.fn()}
        onPaymentModeChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onPaidAmountChange={vi.fn()}
        onCustomerNameChange={vi.fn()}
        onCustomerContactChange={vi.fn()}
        customerSuggestions={[]}
        onCustomerSuggestionSelect={vi.fn()}
        onHoldSale={vi.fn()}
        onProcessSale={vi.fn()}
      />,
    );

    fireEvent.change(within(view.container).getByLabelText("Product ID / Barcode"), { target: { value: "P001" } });
    fireEvent.change(within(view.container).getByLabelText("Qty"), { target: { value: "3" } });
    fireEvent.click(within(view.container).getByRole("button", { name: "Add to Cart" }));

    expect(within(view.container).getByRole("dialog", { name: "Stock Warning" })).toBeTruthy();
    expect(within(view.container).getByText("Insufficient stock. Available: 2.00. Update stock before billing.")).toBeTruthy();
    expect(onQuickAddProduct).not.toHaveBeenCalled();
  });
});
