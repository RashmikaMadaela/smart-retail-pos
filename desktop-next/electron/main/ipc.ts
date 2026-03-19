import { ipcMain } from "electron";
import { z } from "zod";
import { login } from "../../backend/services/authService";
import { listProducts, searchProducts } from "../../backend/services/catalogService";
import { getFinancialSummary } from "../../backend/services/reportService";

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
}
