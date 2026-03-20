/** @vitest-environment jsdom */
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { CustomersTab } from "./CustomersTab";

describe("CustomersTab", () => {
  test("supports selecting customer and applying payment", () => {
    const onSelectCustomer = vi.fn();
    const onApplyCustomerPayment = vi.fn();

    render(
      <CustomersTab
        customers={[{ id: 7, name: "Nimal", contact: "0771231234", total_outstanding: 500 }]}
        selectedCustomerId={null}
        customerSearchText=""
        customerPayment="200"
        customerLedger={{ customer: null, sales: [] }}
        onRefreshCustomers={vi.fn()}
        onCustomerSearchChange={vi.fn()}
        onSelectCustomer={onSelectCustomer}
        onCustomerPaymentChange={vi.fn()}
        onApplyCustomerPayment={onApplyCustomerPayment}
      />,
    );

    fireEvent.click(screen.getByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "Record Payment" }));

    expect(onSelectCustomer).toHaveBeenCalledWith(7);
    expect(onApplyCustomerPayment).toHaveBeenCalledTimes(1);
  });
});
