export type Product = {
  id: number;
  barcode_id: string;
  name: string;
  buy_price?: number;
  sell_price: number;
  stock: number;
  default_discount_pct?: number;
  card_surcharge_pct?: number;
  card_surcharge_enabled?: number;
  created_at?: string;
};

export type InventoryStats = {
  total: number;
  lowStock: number;
  outOfStock: number;
};

export type ProductPageResult = {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
};

export type Summary = {
  gross_sales: number;
  cogs: number;
  expenses: number;
  net_profit: number;
};

export type PeriodBreakdown = {
  period: string;
  gross_sales: number;
  cogs: number;
  expenses: number;
  net_profit: number;
};

export type CartItem = {
  product_id: number;
  barcode_id: string;
  name: string;
  qty: number;
  price: number;
  discount: number;
  scanned_barcode?: string;
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

export type Expense = {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string;
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
  matched_product_id?: number;
  qty_received: string;
  unit_cost: string;
  line_discount_pct: string;
  resolution_mode?: "update-existing" | "create-variant";
  create_new_item?: boolean;
  new_item_name?: string;
  new_item_sell_price?: string;
  new_item_buy_price?: string;
  new_item_default_discount_pct?: string;
  new_item_card_surcharge_enabled?: boolean;
  new_item_card_surcharge_pct?: string;
};

export type ActiveTab = "dashboard" | "billing" | "inventory" | "held" | "customers" | "suppliers" | "operations";
