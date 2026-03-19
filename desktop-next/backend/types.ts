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

