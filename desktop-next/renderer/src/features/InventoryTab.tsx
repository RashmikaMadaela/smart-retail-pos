import { useEffect, useMemo, useState } from "react";
import type { Product } from "./types";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";

type InventoryTabProps = {
  products: Product[];
  onRefreshProducts: () => void;
  onCreateProduct: (payload: {
    barcode_id?: string;
    name: string;
    qty: number;
    buy_price: number;
    sell_price: number;
    default_discount_pct?: number;
    card_surcharge_pct?: number;
  }) => Promise<{ ok: true; barcode_id: string; action: "created" | "updated" } | { ok: false }>;
  isSuperAdmin: boolean;
  onClearInventory: () => void;
  onExportInventory: () => void;
  onImportInventory: (filePath: string) => void;
  onPickImportFile: () => Promise<string | null>;
  onOpenExportFolder: () => void;
};

export function InventoryTab({
  products,
  onRefreshProducts,
  onCreateProduct,
  isSuperAdmin,
  onClearInventory,
  onExportInventory,
  onImportInventory,
  onPickImportFile,
  onOpenExportFolder,
}: InventoryTabProps) {
  const [inventorySearch, setInventorySearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [importFilePath, setImportFilePath] = useState("");
  const [newBarcode, setNewBarcode] = useState("");
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newBuyPrice, setNewBuyPrice] = useState("");
  const [newSellPrice, setNewSellPrice] = useState("");
  const [newDiscPct, setNewDiscPct] = useState("");
  const [newCardSurchargePct, setNewCardSurchargePct] = useState("");
  const [barcodeMatched, setBarcodeMatched] = useState(false);

  useEffect(() => {
    const normalizedBarcode = newBarcode.trim().toLowerCase();
    if (!normalizedBarcode) {
      setBarcodeMatched(false);
      return;
    }

    const match = products.find((product) => product.barcode_id.trim().toLowerCase() === normalizedBarcode);
    if (!match) {
      setBarcodeMatched(false);
      return;
    }

    setBarcodeMatched(true);
    setNewName(match.name || "");
    setNewQty(String(Number(match.stock || 0)));
    setNewBuyPrice(String(Number(match.buy_price || 0)));
    setNewSellPrice(String(Number(match.sell_price || 0)));
    setNewDiscPct(String(Number(match.default_discount_pct || 0)));
    const surchargePct = Number(match.card_surcharge_enabled || 0) > 0 ? Number(match.card_surcharge_pct || 0) : 0;
    setNewCardSurchargePct(String(surchargePct));
  }, [newBarcode, products]);

  async function addProductRow() {
    const payload = {
      barcode_id: newBarcode.trim() || undefined,
      name: newName.trim(),
      qty: Number(newQty || "0"),
      buy_price: Number(newBuyPrice || "0"),
      sell_price: Number(newSellPrice || "0"),
      default_discount_pct: Number(newDiscPct || "0"),
      card_surcharge_pct: Number(newCardSurchargePct || "0"),
    };

    const result = await onCreateProduct(payload);
    if (!result.ok) {
      return;
    }

    setNewBarcode("");
    setNewName("");
    setNewQty("");
    setNewBuyPrice("");
    setNewSellPrice("");
    setNewDiscPct("");
    setNewCardSurchargePct("");
    setBarcodeMatched(false);
  }

  const filtered = useMemo(() => {
    const keyword = inventorySearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesKeyword =
        !keyword ||
        product.barcode_id.toLowerCase().includes(keyword) ||
        product.name.toLowerCase().includes(keyword);
      const matchesLowStock = !lowStockOnly || Number(product.stock) <= 5;
      return matchesKeyword && matchesLowStock;
    });
  }, [products, inventorySearch, lowStockOnly]);

  const outOfStockCount = products.filter((p) => Number(p.stock) <= 0).length;
  const lowStockCount = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5).length;

  return (
    <section className="space-y-4">
      <ToolbarCard
        title="Inventory"
        description="Browse and monitor product stock levels in real time."
        actions={
          <>
            <input
              className="w-64 max-w-full"
              placeholder="Search ID or product name"
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
            />
            <label className="m-0 inline-flex items-center gap-2 rounded-xl border border-border/80 px-3 py-2 text-sm text-foreground">
              <input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} />
              Low stock only
            </label>
            <button type="button" onClick={onRefreshProducts}>
              Refresh Products
            </button>
          </>
        }
      />

      <SurfaceCard title="Add Product" subtitle="Single-row quick entry. Leave barcode blank to auto-generate as PS-10001, PS-10002, ...">
        {barcodeMatched ? <p className="mb-2 mt-0 text-xs text-sky-200">Existing barcode found. Fields auto-filled, edit and click Update.</p> : null}
        <div className="grid gap-2 xl:grid-cols-[1.1fr_1.6fr_0.7fr_0.9fr_0.9fr_0.7fr_1fr_auto]">
          <input placeholder="Barcode (optional)" value={newBarcode} onChange={(event) => setNewBarcode(event.target.value)} />
          <input placeholder="Product Name" value={newName} onChange={(event) => setNewName(event.target.value)} />
          <input className="no-spinner" type="number" min="0" step="1" placeholder="Qty" value={newQty} onChange={(event) => setNewQty(event.target.value)} />
          <input
            className="no-spinner"
            type="number"
            min="0"
            step="0.01"
            placeholder="Buying Price"
            value={newBuyPrice}
            onChange={(event) => setNewBuyPrice(event.target.value)}
          />
          <input
            className="no-spinner"
            type="number"
            min="0"
            step="0.01"
            placeholder="Selling Price"
            value={newSellPrice}
            onChange={(event) => setNewSellPrice(event.target.value)}
          />
          <input className="no-spinner" type="number" min="0" max="100" step="0.01" placeholder="Disc (%)" value={newDiscPct} onChange={(event) => setNewDiscPct(event.target.value)} />
          <input
            className="no-spinner"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="Card surcharge (%)"
            value={newCardSurchargePct}
            onChange={(event) => setNewCardSurchargePct(event.target.value)}
          />
          <button type="button" onClick={() => void addProductRow()}>
            {barcodeMatched ? "Update" : "Add"}
          </button>
        </div>
      </SurfaceCard>

      {isSuperAdmin ? (
        <SurfaceCard title="SuperAdmin Inventory Tools" subtitle="Clear all product records and export/import inventory backups.">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <input
              placeholder="Path to exported inventory JSON"
              value={importFilePath}
              onChange={(event) => setImportFilePath(event.target.value)}
            />
            <button
              type="button"
              onClick={async () => {
                const picked = await onPickImportFile();
                if (picked) {
                  setImportFilePath(picked);
                }
              }}
            >
              Browse File
            </button>
            <button type="button" onClick={() => onImportInventory(importFilePath)}>
              Import Inventory
            </button>
            <button type="button" onClick={onExportInventory}>
              Export Inventory
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onOpenExportFolder}>
              Open Export Folder
            </button>
            <button type="button" className="danger" onClick={onClearInventory}>
              Clear All Inventory Records
            </button>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <SurfaceCard title="Total Products" contentClassName="pt-3">
          <p className="m-0 text-2xl font-semibold text-foreground">{products.length}</p>
        </SurfaceCard>
        <SurfaceCard title="Low Stock" contentClassName="pt-3">
          <p className="m-0 text-2xl font-semibold text-amber-300">{lowStockCount}</p>
        </SurfaceCard>
        <SurfaceCard title="Out of Stock" contentClassName="pt-3">
          <p className="m-0 text-2xl font-semibold text-rose-300">{outOfStockCount}</p>
        </SurfaceCard>
      </div>

      <SurfaceCard title="Products" className="overflow-hidden" contentClassName="p-0">
        <table className="m-0">
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Product Name</th>
              <th>Qty</th>
              <th>Buying Price</th>
              <th>Selling Price</th>
              <th>Disc (%)</th>
              <th>Card Surcharge (%)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No products match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const stockValue = Number(product.stock);
                const status = stockValue <= 0 ? "Out" : stockValue <= 5 ? "Low" : "Healthy";
                const surcharge = Number(product.card_surcharge_enabled || 0) > 0 ? Number(product.card_surcharge_pct || 0).toFixed(2) : "0.00";
                return (
                  <tr key={product.barcode_id}>
                    <td>{product.barcode_id}</td>
                    <td>{product.name}</td>
                    <td>{stockValue.toFixed(2)}</td>
                    <td>{Number(product.buy_price || 0).toFixed(2)}</td>
                    <td>{Number(product.sell_price).toFixed(2)}</td>
                    <td>{Number(product.default_discount_pct || 0).toFixed(2)}</td>
                    <td>{surcharge}</td>
                    <td>{status}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </SurfaceCard>
    </section>
  );
}
