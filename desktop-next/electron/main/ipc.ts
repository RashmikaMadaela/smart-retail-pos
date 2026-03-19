import { ipcMain } from "electron";
import { z } from "zod";
import { login } from "../../backend/services/authService";
import { listProducts, searchProducts } from "../../backend/services/catalogService";
import { getFinancialSummary } from "../../backend/services/reportService";
import { completeHeldSale, holdSale, listHeldSales, processSale, recallHeldSale } from "../../backend/services/salesService";
import {
  createOrGetCustomer,
  createSupplier,
  getCustomer,
  getCustomerLedger,
  getSupplierLedger,
  listSupplierBatches,
  listSuppliers,
  receiveSupplierBatch,
  recordCustomerPayment,
  recordSupplierPayment,
  searchCustomers,
  searchSuppliers,
} from "../../backend/services/ledgerService";
import { createExpense, listExpenses } from "../../backend/services/expenseService";
import { exportBarcodePdf, exportSaleBillPdf } from "../../backend/services/printService";
import { clearInventoryStock, exportInventoryToJson, importInventoryFromJson } from "../../backend/services/inventoryAdminService";

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

const createCustomerSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
});

const searchCustomerSchema = z.object({
  search_text: z.string().optional(),
  limit: z.number().int().positive().max(500).optional(),
});

const customerIdSchema = z.object({
  customer_id: z.number().int().positive(),
});

const customerPaymentSchema = z.object({
  customer_id: z.number().int().positive(),
  amount: z.number().positive(),
});

const supplierCreateSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  opening_balance: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const supplierSearchSchema = z.object({
  search_text: z.string().optional(),
  limit: z.number().int().positive().max(500).optional(),
});

const receiveBatchSchema = z.object({
  supplier_id: z.number().int().positive(),
  reference_no: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().optional(),
        qty_received: z.number().positive(),
        unit_cost: z.number().nonnegative(),
        line_discount_pct: z.number().nonnegative().max(100),
        new_product: z
          .object({
            barcode_id: z.string().optional(),
            name: z.string().min(1),
            buy_price: z.number().positive(),
            sell_price: z.number().positive(),
            default_discount_pct: z.number().nonnegative().max(100).optional(),
            card_surcharge_enabled: z.boolean().optional(),
            card_surcharge_pct: z.number().nonnegative().max(100).optional(),
            min_stock: z.number().nonnegative().optional(),
          })
          .optional(),
      }),
    )
    .min(1),
  paid_amount: z.number().nonnegative().optional(),
});

const supplierBatchSchema = z.object({
  supplier_id: z.number().int().positive(),
  include_settled: z.boolean().optional(),
});

const supplierPaymentSchema = z.object({
  supplier_id: z.number().int().positive(),
  batch_id: z.number().int().positive(),
  amount: z.number().positive(),
  method: z.string().optional(),
  note: z.string().optional(),
});

const expenseListSchema = z.object({
  limit: z.number().int().positive().max(500).optional(),
});

const expenseCreateSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().optional(),
});

const salePrintSchema = z.object({
  sale_id: z.number().int().positive(),
});

const barcodePrintSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        name: z.string().optional(),
        qty: z.number().positive(),
      }),
    )
    .min(1),
});

const superAdminRoleSchema = z.object({
  role: z.literal("SuperAdmin"),
});

const inventoryImportSchema = z.object({
  role: z.literal("SuperAdmin"),
  file_path: z.string().min(1),
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

  ipcMain.handle("customer.createOrGet", async (_event, payload) => {
    const parsed = createCustomerSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid createOrGet customer payload");
    }
    const result = createOrGetCustomer(parsed.data.name, parsed.data.contact || "");
    return result.ok ? ok(result.data) : fail(result.error);
  });

  ipcMain.handle("customer.search", async (_event, payload) => {
    const parsed = searchCustomerSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      return fail("Invalid customer search payload");
    }
    return ok(searchCustomers(parsed.data.search_text || "", parsed.data.limit ?? 200));
  });

  ipcMain.handle("customer.get", async (_event, payload) => {
    const parsed = customerIdSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid customer get payload");
    }
    return ok(getCustomer(parsed.data.customer_id));
  });

  ipcMain.handle("customer.getLedger", async (_event, payload) => {
    const parsed = customerIdSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid customer ledger payload");
    }
    return ok(getCustomerLedger(parsed.data.customer_id));
  });

  ipcMain.handle("customer.recordPayment", async (_event, payload) => {
    const parsed = customerPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid customer payment payload");
    }
    const result = recordCustomerPayment(parsed.data.customer_id, parsed.data.amount);
    return result.ok ? ok({ message: result.data }) : fail(result.error);
  });

  ipcMain.handle("supplier.create", async (_event, payload) => {
    const parsed = supplierCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid supplier create payload");
    }
    const result = createSupplier(
      parsed.data.name,
      parsed.data.contact || "",
      parsed.data.opening_balance ?? 0,
      parsed.data.notes || "",
    );
    return result.ok ? ok({ message: result.data }) : fail(result.error);
  });

  ipcMain.handle("supplier.list", async (_event, payload) => {
    const parsed = supplierSearchSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      return fail("Invalid supplier list payload");
    }
    if ((parsed.data.search_text || "").trim()) {
      return ok(searchSuppliers(parsed.data.search_text || "", parsed.data.limit ?? 200));
    }
    return ok(listSuppliers(parsed.data.limit ?? 200));
  });

  ipcMain.handle("supplier.receiveBatch", async (_event, payload) => {
    const parsed = receiveBatchSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid supplier receiveBatch payload");
    }
    const result = receiveSupplierBatch(
      parsed.data.supplier_id,
      parsed.data.reference_no || "",
      parsed.data.items,
      parsed.data.paid_amount ?? 0,
    );
    return result.ok ? ok({ batch_id: result.data }) : fail(result.error);
  });

  ipcMain.handle("supplier.listBatches", async (_event, payload) => {
    const parsed = supplierBatchSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid supplier listBatches payload");
    }
    return ok(listSupplierBatches(parsed.data.supplier_id, parsed.data.include_settled ?? true));
  });

  ipcMain.handle("supplier.recordPayment", async (_event, payload) => {
    const parsed = supplierPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid supplier payment payload");
    }
    const result = recordSupplierPayment(
      parsed.data.supplier_id,
      parsed.data.batch_id,
      parsed.data.amount,
      parsed.data.method || "CASH",
      parsed.data.note || "",
    );
    return result.ok ? ok({ message: result.data }) : fail(result.error);
  });

  ipcMain.handle("supplier.getLedger", async (_event, payload) => {
    const parsed = z.object({ supplier_id: z.number().int().positive() }).safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid supplier ledger payload");
    }
    return ok(getSupplierLedger(parsed.data.supplier_id));
  });

  ipcMain.handle("expense.list", async (_event, payload) => {
    const parsed = expenseListSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      return fail("Invalid expense list payload");
    }
    return ok(listExpenses(parsed.data.limit ?? 100));
  });

  ipcMain.handle("expense.create", async (_event, payload) => {
    const parsed = expenseCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid expense create payload");
    }
    const result = createExpense(parsed.data.description, parsed.data.amount, parsed.data.category || "General");
    return result.ok ? ok({ expense_id: result.data }) : fail(result.error);
  });

  ipcMain.handle("print.salePdf", async (_event, payload) => {
    const parsed = salePrintSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid sale print payload");
    }
    const result = await exportSaleBillPdf(parsed.data.sale_id);
    return result.ok ? ok(result.data) : fail(result.error);
  });

  ipcMain.handle("print.barcodePdf", async (_event, payload) => {
    const parsed = barcodePrintSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid barcode print payload");
    }
    const result = await exportBarcodePdf({ items: parsed.data.items });
    return result.ok ? ok(result.data) : fail(result.error);
  });

  ipcMain.handle("inventory.clearStock", async (_event, payload) => {
    const parsed = superAdminRoleSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("SuperAdmin role required.");
    }
    const result = clearInventoryStock();
    return result.ok ? ok(result.data) : fail(result.error);
  });

  ipcMain.handle("inventory.exportData", async (_event, payload) => {
    const parsed = superAdminRoleSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("SuperAdmin role required.");
    }
    const result = await exportInventoryToJson();
    return result.ok ? ok(result.data) : fail(result.error);
  });

  ipcMain.handle("inventory.importData", async (_event, payload) => {
    const parsed = inventoryImportSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Invalid inventory import payload.");
    }
    const result = await importInventoryFromJson(parsed.data.file_path);
    return result.ok ? ok(result.data) : fail(result.error);
  });
}
