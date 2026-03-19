import { ipcMain } from "electron";
import { z } from "zod";
import { login } from "../../backend/services/authService";
import { listProducts, searchProducts } from "../../backend/services/catalogService";
import { getFinancialSummary } from "../../backend/services/reportService";
import { completeHeldSale, holdSale, listHeldSales, processSale, recallHeldSale } from "../../backend/services/salesService";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const searchSchema = z.object({
  searchText: z.string(),
  limit: z.number().int().positive().max(200).optional(),
});

const listSchema = z.object({
  limit: z.number().int().positive().max(1000).optional(),
});

const cartItemSchema = z.object({
  product_id: z.string().min(1),
  qty: z.number().positive(),
  price: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  applied_surcharge: z.number().nonnegative().optional(),
});

const processSaleSchema = z.object({
  cashier_id: z.number().int().positive(),
  customer_id: z.number().int().positive().nullable(),
  cart_items: z.array(cartItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  global_discount: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  status: z.enum(["COMPLETED", "HELD", "VOID"]).optional(),
  paid_amount: z.number().nonnegative().nullable().optional(),
  payment_status: z.enum(["PAID", "PARTIAL", "UNPAID"]).nullable().optional(),
  payment_method: z.enum(["CASH", "CARD"]).optional(),
});

const holdSaleSchema = z.object({
  cashier_id: z.number().int().positive(),
  cart_items: z.array(cartItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  global_discount: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  payment_method: z.enum(["CASH", "CARD"]).optional(),
});

const recallSchema = z.object({
  sale_id: z.number().int().positive(),
});

const listHeldSchema = z.object({
  cashier_id: z.number().int().positive().optional(),
});

const completeHeldSchema = z.object({
  sale_id: z.number().int().positive(),
  customer_id: z.number().int().positive().nullable().optional(),
  paid_amount: z.number().nonnegative().nullable().optional(),
  payment_status: z.enum(["PAID", "PARTIAL", "UNPAID"]).nullable().optional(),
  cart_items: z.array(cartItemSchema).optional(),
  subtotal: z.number().nonnegative().optional(),
  global_discount: z.number().nonnegative().optional(),
  total_amount: z.number().nonnegative().optional(),
  payment_method: z.enum(["CASH", "CARD"]).optional(),
});

function ok<T>(data: T) {
  return { ok: true as const, data };
}

function fail(message: string) {
  return { ok: false as const, error: message };
}

export function registerIpcHandlers() {
  ipcMain.handle("auth.login", async (_event, payload) => {
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid login payload");
    }
    const result = login(parsed.data.username, parsed.data.password);
    return result.ok ? ok(result.user) : fail(result.error);
  });

  ipcMain.handle("catalog.listProducts", async (_event, payload) => {
    const parsed = listSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      return fail("Invalid list payload");
    }
    return ok(listProducts(parsed.data.limit ?? 200));
  });

  ipcMain.handle("catalog.searchProducts", async (_event, payload) => {
    const parsed = searchSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      return fail("Invalid search payload");
    }
    return ok(searchProducts(parsed.data.searchText, parsed.data.limit ?? 25));
  });

  ipcMain.handle("report.summary", async () => {
    return ok(getFinancialSummary());
  });

  ipcMain.handle("sales.processSale", async (_event, payload) => {
    const parsed = processSaleSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid processSale payload");
    }
    const result = processSale(parsed.data);
    return result.ok ? ok({ sale_id: result.data }) : fail(result.error);
  });

  ipcMain.handle("sales.holdSale", async (_event, payload) => {
    const parsed = holdSaleSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid holdSale payload");
    }
    const result = holdSale(parsed.data);
    return result.ok ? ok({ sale_id: result.data }) : fail(result.error);
  });

  ipcMain.handle("sales.listHeldSales", async (_event, payload) => {
    const parsed = listHeldSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      return fail("Invalid listHeldSales payload");
    }
    return ok(listHeldSales(parsed.data.cashier_id));
  });

  ipcMain.handle("sales.recallHeldSale", async (_event, payload) => {
    const parsed = recallSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid recallHeldSale payload");
    }
    const result = recallHeldSale(parsed.data.sale_id);
    return result.ok ? ok(result.data) : fail(result.error);
  });

  ipcMain.handle("sales.completeHeldSale", async (_event, payload) => {
    const parsed = completeHeldSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid completeHeldSale payload");
    }
    const result = completeHeldSale(parsed.data);
    return result.ok ? ok({ message: result.data }) : fail(result.error);
  });
}
