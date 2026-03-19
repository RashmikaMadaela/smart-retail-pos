import { useMemo, useState } from "react";
import type { Product } from "./types";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ToolbarCard } from "@/components/ui/ToolbarCard";

type InventoryTabProps = {
  products: Product[];
  onRefreshProducts: () => void;
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
              <th>ID</th>
              <th>Name</th>
              <th>Selling Price</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No products match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const stockValue = Number(product.stock);
                const status = stockValue <= 0 ? "Out" : stockValue <= 5 ? "Low" : "Healthy";
                return (
                  <tr key={product.barcode_id}>
                    <td>{product.barcode_id}</td>
                    <td>{product.name}</td>
                    <td>{Number(product.sell_price).toFixed(2)}</td>
                    <td>{stockValue.toFixed(2)}</td>
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
