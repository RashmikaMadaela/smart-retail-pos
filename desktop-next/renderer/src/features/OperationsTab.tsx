import { useMemo, useState } from "react";
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
        title="Barcode & Expenses"
        description="Manage barcode print queue and expense entries."
        actions={
          <button type="button" onClick={onRefreshExpenses}>
            Refresh Expenses
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard title="Barcode Queue" subtitle="Prepare product labels for printing workflow.">
          <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
            <input
              placeholder="Barcode/Product ID"
              value={barcodeInput}
              onChange={(event) => setBarcodeInput(event.target.value)}
            />
            <input value={barcodeQty} onChange={(event) => setBarcodeQty(event.target.value)} placeholder="Qty" />
            <button type="button" onClick={addToQueue}>
              Add to Queue
            </button>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">Queued labels: {queueCount.toFixed(2)}</p>

          <div className="mt-3 overflow-hidden rounded-xl border border-border/80 bg-card/40">
            <table className="m-0">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No labels queued.
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
              {isPrinting ? "Saving/Printing..." : "Print Barcodes (Save PDF)"}
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard title="Expenses" subtitle="Record operating expenses and review recent entries.">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Description
              <input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-foreground">
              Amount
              <input value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-foreground">
              Category
              <input value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} />
            </label>
            <div className="self-end">
              <button type="button" onClick={submitExpense}>
                Record Expense
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-border/80 bg-card/40">
            <table className="m-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No expenses found.
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
