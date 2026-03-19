export type AuthUser = {
  id: number;
  username: string;
  role: "Admin" | "Cashier";
};

export type Product = {
  barcode_id: string;
  name: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  default_discount_pct: number;
  card_surcharge_enabled: number;
  card_surcharge_pct: number;
};

export type FinancialSummary = {
  gross_sales: number;
  cogs: number;
  expenses: number;
  net_profit: number;
};

export type CartItem = {
  product_id: string;
  qty: number;
  price: number;
  discount: number;
  applied_surcharge?: number;
};

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type HeldSaleRow = {
  id: number;
  timestamp: string;
  total: number;
  subtotal: number;
  discount: number;
  cashier: string | null;
};

export type SaleItemRow = {
  product_id: string;
  name: string | null;
  qty: number;
  sold_at_price: number;
  item_discount: number;
  applied_surcharge: number;
};

export type SaleWithItems = {
  sale: {
    id: number;
    timestamp: string;
    subtotal: number;
    discount: number;
    total: number;
    status: string;
    paid_amount: number;
    balance_due: number;
    payment_status: string;
    payment_method: string;
    cashier: string | null;
    customer_name: string | null;
    customer_contact: string | null;
  };
  items: SaleItemRow[];
};

export type Customer = {
  id: number;
  name: string;
  contact: string | null;
  total_outstanding: number;
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
    status: string;
  }>;
};

export type Supplier = {
  id: number;
  name: string;
  contact: string | null;
  opening_balance: number;
  total_outstanding: number;
  notes: string | null;
};

export type SupplierLedger = {
  supplier: Supplier | null;
  batches: Array<{
    id: number;
    supplier_id: number;
    reference_no: string | null;
    received_at: string;
    total_cost: number;
    paid_amount: number;
    balance_due: number;
    status: string;
  }>;
  payments: Array<{
    id: number;
    supplier_id: number;
    batch_id: number | null;
    amount: number;
    paid_at: string;
    method: string;
    note: string | null;
  }>;
};

export type SupplierBatchInput = {
  product_id?: string;
  qty_received: number;
  unit_cost: number;
  line_discount_pct: number;
  new_product?: {
    barcode_id?: string;
    name: string;
    buy_price: number;
    sell_price: number;
    default_discount_pct?: number;
    card_surcharge_enabled?: boolean;
    card_surcharge_pct?: number;
    min_stock?: number;
  };
};

