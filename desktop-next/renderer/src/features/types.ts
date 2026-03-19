export type Product = {
  barcode_id: string;
  name: string;
  sell_price: number;
  stock: number;
  default_discount_pct?: number;
};

export type Summary = {
  gross_sales: number;
  cogs: number;
  expenses: number;
  net_profit: number;
};

export type CartItem = {
  product_id: string;
  name: string;
  qty: number;
  price: number;
  discount: number;
};

export type HeldSale = {
  id: number;
  timestamp: string;
  total: number;
  subtotal: number;
  discount: number;
  cashier: string | null;
};

export type Customer = {
  id: number;
  name: string;
  contact: string | null;
  total_outstanding: number;
};

export type Supplier = {
  id: number;
  name: string;
  contact: string | null;
  total_outstanding: number;
};

export type SupplierBatch = {
  id: number;
  reference_no: string | null;
  total_cost: number;
  paid_amount: number;
  balance_due: number;
  status: string;
};

export type SupplierPayment = {
  id: number;
  batch_id: number | null;
  amount: number;
  method: string;
  paid_at: string;
};

export type CustomerLedger = {
  customer: Customer | null;
  sales: Array<{
    id: number;
    timestamp: string;
    total: number;
    paid_amount: number;
    balance_due: number;
    payment_status: string;
  }>;
};

export type SupplierLedger = {
  supplier: Supplier | null;
  batches: SupplierBatch[];
  payments: SupplierPayment[];
};

export type BatchLineDraft = {
  product_id: string;
  qty_received: string;
  unit_cost: string;
  line_discount_pct: string;
};

export type ActiveTab = "billing" | "inventory" | "held" | "customers" | "suppliers";
