import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";
import type { Expense, Product, User } from "./types";

type BarcodeQueueItem = {
  product_id: string;
  name: string;
  qty: number;
  sell_price: number;
};

export type BarcodePrintItem = BarcodeQueueItem;

type OperationsTabProps = {
  products: Product[];
  expenses: Expense[];
  users: User[];
  isSuperAdmin: boolean;
  onRefreshExpenses: () => void;
  onCreateExpense: (payload: { description: string; amount: number; category: string }) => void;
  onPrintBarcodes: (items: BarcodePrintItem[]) => Promise<void>;
  onRefreshUsers: () => void;
  onCreateUser: (username: string, password: string, role: "Admin" | "Cashier" | "SuperAdmin") => void;
  onDeleteUser: (userId: number) => void;
  onFindProductByBarcode: (barcode: string) => Promise<Product | null>;
};

export function OperationsTab({ products, expenses, users, isSuperAdmin, onRefreshExpenses, onCreateExpense, onPrintBarcodes, onRefreshUsers, onCreateUser, onDeleteUser, onFindProductByBarcode }: OperationsTabProps) {
  const { t } = useTranslation();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeQty, setBarcodeQty] = useState("1");
  const [queue, setQueue] = useState<BarcodeQueueItem[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("General");

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"Admin" | "Cashier" | "SuperAdmin">("Cashier");
  const [showPassword, setShowPassword] = useState(false);

  const queueCount = useMemo(() => queue.reduce((acc, item) => acc + item.qty, 0), [queue]);

  async function addToQueue() {
    const id = barcodeInput.trim();
    const qty = Number(barcodeQty || "0");
    if (!id || !Number.isFinite(qty) || qty <= 0) {
      return;
    }

    // Fast path: check bootstrap list first
    let product: Product | null | undefined = products.find((x) => x.barcode_id.toLowerCase() === id.toLowerCase());

    // Fallback: live lookup for products outside the bootstrap limit
    if (!product) {
      product = await onFindProductByBarcode(id);
    }

    if (!product) {
      setQueueError(t("operations.productNotFound"));
      return;
    }

    setQueueError(null);
    setQueue((prev) => {
      const existing = prev.find((item) => item.product_id === product!.barcode_id);
      if (!existing) {
        return [...prev, { product_id: product!.barcode_id, name: product!.name, qty, sell_price: Number(product!.sell_price) }];
      }
      return prev.map((item) =>
        item.product_id === product!.barcode_id ? { ...item, qty: Number((item.qty + qty).toFixed(2)) } : item,
      );
    });

    setBarcodeInput("");
    setBarcodeQty("1");
  }

  function submitExpense() {
    const amount = Number(expenseAmount);
    if (!expenseDescription.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onCreateExpense({ description: expenseDescription, amount, category: expenseCategory });
    setExpenseDescription("");
    setExpenseAmount("");
  }

  function submitNewUser() {
    if (!newUsername.trim() || !newPassword.trim()) {
      return;
    }
    onCreateUser(newUsername.trim(), newPassword, newUserRole);
    setNewUsername("");
    setNewPassword("");
    setNewUserRole("Cashier");
  }

  async function printQueueAsPdf() {
    if (queue.length === 0 || isPrinting) {
      return;
    }
    setIsPrinting(true);
    try {
      await onPrintBarcodes(queue);
      setQueue([]);
    } catch {
      // Keep queue untouched so cashier can retry after fixing printer connection.
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <section className="space-y-4">
      <ToolbarCard
        title={t("operations.title")}
        description={t("operations.description")}
        actions={
          <button type="button" onClick={onRefreshExpenses}>
            {t("operations.refreshExpenses")}
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard title={t("operations.barcodeQueue")} subtitle={t("operations.barcodeQueueSubtitle")}>
          <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
            <label className="m-0 block text-sm font-medium text-foreground">
              {t("operations.barcodeInput")}
              <input
                value={barcodeInput}
                onChange={(event) => setBarcodeInput(event.target.value)}
              />
            </label>
            <label className="m-0 block text-sm font-medium text-foreground">
              {t("operations.qty")}
              <input value={barcodeQty} onChange={(event) => setBarcodeQty(event.target.value)} />
            </label>
            <button type="button" onClick={() => void addToQueue()}>
              {t("operations.addToQueue")}
            </button>
          </div>

          {queueError && <p className="mt-2 text-sm text-destructive">{queueError}</p>}

          <p className="mt-3 text-sm text-muted-foreground">{t("operations.queued", { count: Number(queueCount.toFixed(2)) })}</p>

          <div className="mt-3 overflow-hidden rounded-xl border border-border/80 bg-card/40">
            <table className="m-0">
              <thead>
                <tr>
                  <th>{t("operations.productId")}</th>
                  <th>{t("operations.name")}</th>
                  <th>{t("operations.price")}</th>
                  <th>{t("operations.qty")}</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      {t("operations.emptyQueue")}
                    </td>
                  </tr>
                ) : (
                  queue.map((item) => (
                    <tr key={item.product_id}>
                      <td>{item.product_id}</td>
                      <td>{item.name}</td>
                      <td>{Number(item.sell_price).toFixed(2)}</td>
                      <td>{item.qty.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void printQueueAsPdf()} disabled={queue.length === 0 || isPrinting}>
              {isPrinting ? t("operations.printing") : t("operations.print")}
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard title={t("operations.expenses")} subtitle={t("operations.expensesSubtitle")}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              {t("operations.expenseDescription")}
              <input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-foreground">
              {t("operations.amount")}
              <input value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-foreground">
              {t("operations.category")}
              <input value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} />
            </label>
            <div className="self-end">
              <button type="button" onClick={submitExpense}>
                {t("operations.recordExpense")}
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-border/80 bg-card/40">
            <table className="m-0">
              <thead>
                <tr>
                  <th>{t("held.id")}</th>
                  <th>{t("operations.expenseDescription")}</th>
                  <th>{t("operations.category")}</th>
                  <th>{t("operations.amount")}</th>
                  <th>{t("operations.date")}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      {t("operations.emptyExpenses")}
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.id}</td>
                      <td>{expense.description}</td>
                      <td>{expense.category}</td>
                      <td>{Number(expense.amount).toFixed(2)}</td>
                      <td>{expense.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </div>

      {isSuperAdmin ? (
        <SurfaceCard title={t("operations.userManagement")} subtitle={t("operations.userManagementSubtitle")}>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="text-sm font-medium text-foreground">
              {t("operations.username")}
              <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-foreground">
              {t("operations.password")}
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label className="text-sm font-medium text-foreground">
              {t("operations.role")}
              <select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value as "Admin" | "Cashier" | "SuperAdmin")}>
                <option value="Cashier">{t("operations.cashier")}</option>
                <option value="Admin">{t("operations.admin")}</option>
                <option value="SuperAdmin">{t("operations.superAdmin")}</option>
              </select>
            </label>
            <div className="self-end">
              <button type="button" onClick={submitNewUser}>
                {t("operations.createUser")}
              </button>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button type="button" onClick={onRefreshUsers}>
              {t("operations.refreshUsers")}
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-border/80 bg-card/40">
            <table className="m-0">
              <thead>
                <tr>
                  <th>{t("held.id")}</th>
                  <th>{t("operations.username")}</th>
                  <th>{t("operations.role")}</th>
                  <th>{t("operations.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      {t("operations.emptyUsers")}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.role}</td>
                      <td>
                        {user.role !== "SuperAdmin" ? (
                          <button type="button" className="danger" onClick={() => onDeleteUser(user.id)}>
                            {t("operations.deleteUser")}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      ) : null}
    </section>
  );
}
