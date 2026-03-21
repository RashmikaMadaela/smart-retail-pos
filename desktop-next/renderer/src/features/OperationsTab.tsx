import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";
import type { Expense, Product } from "./types";

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
  onRefreshExpenses: () => void;
  onCreateExpense: (payload: { description: string; amount: number; category: string }) => void;
  onPrintBarcodes: (items: BarcodePrintItem[]) => Promise<void>;
};

export function OperationsTab({ products, expenses, onRefreshExpenses, onCreateExpense, onPrintBarcodes }: OperationsTabProps) {
  const { t } = useTranslation();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeQty, setBarcodeQty] = useState("1");
  const [queue, setQueue] = useState<BarcodeQueueItem[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("General");

  const queueCount = useMemo(() => queue.reduce((acc, item) => acc + item.qty, 0), [queue]);

  function addToQueue() {
    const id = barcodeInput.trim();
    const qty = Number(barcodeQty || "0");
    if (!id || !Number.isFinite(qty) || qty <= 0) {
      return;
    }
    const product = products.find((x) => x.barcode_id.toLowerCase() === id.toLowerCase());
    if (!product) {
      return;
    }

    setQueue((prev) => {
      const existing = prev.find((item) => item.product_id === product.barcode_id);
      if (!existing) {
        return [...prev, { product_id: product.barcode_id, name: product.name, qty, sell_price: Number(product.sell_price) }];
      }
      return prev.map((item) =>
        item.product_id === product.barcode_id ? { ...item, qty: Number((item.qty + qty).toFixed(2)) } : item,
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

  async function printQueueAsPdf() {
    if (queue.length === 0 || isPrinting) {
      return;
    }
    setIsPrinting(true);
    try {
      await onPrintBarcodes(queue);
      setQueue([]);
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
            <button type="button" onClick={addToQueue}>
              {t("operations.addToQueue")}
            </button>
          </div>

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
    </section>
  );
}
