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
