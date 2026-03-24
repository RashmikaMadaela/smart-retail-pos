import { create } from "zustand";
import type { CartItem } from "@/features/types";

type PaymentMode = "PAID" | "PARTIAL" | "UNPAID";
type PaymentMethod = "CASH" | "CARD";

type BillingState = {
  searchText: string;
  selectedProductId: string;
  addQty: string;
  paymentMode: PaymentMode;
  paymentMethod: PaymentMethod;
  paidAmount: string;
  customerName: string;
  customerContact: string;
  cart: CartItem[];
  setSearchText: (value: string) => void;
  setSelectedProductId: (value: string) => void;
  setAddQty: (value: string) => void;
  setPaymentMode: (value: PaymentMode) => void;
  setPaymentMethod: (value: PaymentMethod) => void;
  setPaidAmount: (value: string) => void;
  setCustomerName: (value: string) => void;
  setCustomerContact: (value: string) => void;
  resetCheckoutFields: () => void;
  setCart: (rows: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  clearCart: () => void;
};

export const useBillingStore = create<BillingState>((set) => ({
  searchText: "",
  selectedProductId: "",
  addQty: "1",
  paymentMode: "PAID",
  paymentMethod: "CASH",
  paidAmount: "",
  customerName: "",
  customerContact: "",
  cart: [],
  setSearchText: (searchText) => set({ searchText }),
  setSelectedProductId: (selectedProductId) => set({ selectedProductId }),
  setAddQty: (addQty) => set({ addQty }),
  setPaymentMode: (paymentMode) => set({ paymentMode }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setPaidAmount: (paidAmount) => set({ paidAmount }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerContact: (customerContact) => set({ customerContact }),
  resetCheckoutFields: () =>
    set({
      paymentMode: "PAID",
      paymentMethod: "CASH",
      paidAmount: "",
      customerName: "",
      customerContact: "",
    }),
  setCart: (rows) =>
    set((state) => ({
      cart: typeof rows === "function" ? rows(state.cart) : rows,
    })),
  clearCart: () => set({ cart: [] }),
}));
