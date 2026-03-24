import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  onRemoveProduct?: (payload: { barcode_id: string }) => Promise<{ ok: true } | { ok: false }>;
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
  onRemoveProduct,
  isSuperAdmin,
  onClearInventory,
  onExportInventory,
  onImportInventory,
  onPickImportFile,
  onOpenExportFolder,
}: InventoryTabProps) {
  const { t } = useTranslation();
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
  const [removeBarcode, setRemoveBarcode] = useState("");
  const [removeName, setRemoveName] = useState("");

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

  const nameSuggestions = useMemo(() => {
    const needle = newName.trim().toLowerCase();
    if (!needle) {
      return products.slice(0, 12);
    }
    return products
      .filter((product) => product.name.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [products, newName]);

  const removeNameSuggestions = useMemo(() => {
    const needle = removeName.trim().toLowerCase();
    if (!needle) {
      return products.slice(0, 12);
    }
    return products
      .filter((product) => product.name.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [products, removeName]);

  useEffect(() => {
    const normalizedBarcode = removeBarcode.trim().toLowerCase();
    if (!normalizedBarcode) {
      return;
    }

    const matched = products.find((product) => product.barcode_id.trim().toLowerCase() === normalizedBarcode);
    if (matched && matched.name !== removeName) {
      setRemoveName(matched.name);
    }
  }, [products, removeBarcode, removeName]);

  async function removeProductRow() {
    if (!onRemoveProduct) {
      return;
    }

    const byBarcode = removeBarcode.trim();
    const byName = removeName.trim().toLowerCase();
    const matched = products.find(
      (product) => product.barcode_id.trim().toLowerCase() === byBarcode.toLowerCase() || product.name.trim().toLowerCase() === byName,
    );
    const barcodeToRemove = (byBarcode || matched?.barcode_id || "").trim();
    if (!barcodeToRemove) {
      return;
    }

    const result = await onRemoveProduct({ barcode_id: barcodeToRemove });
    if (!result.ok) {
      return;
    }

    setRemoveBarcode("");
    setRemoveName("");
  }

  const outOfStockCount = products.filter((p) => Number(p.stock) <= 0).length;
  const lowStockCount = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5).length;

  return (
    <section className="space-y-4">
      <ToolbarCard
        title={t("inventory.title")}
        description={t("inventory.description")}
        actions={
          <>
            <label className="m-0 flex w-64 max-w-full flex-col gap-1 text-sm font-medium text-foreground">
              {t("inventory.search")}
              <input
                className="w-64 max-w-full"
                value={inventorySearch}
                onChange={(event) => setInventorySearch(event.target.value)}
              />
            </label>
            <label className="m-0 inline-flex items-center gap-2 rounded-xl border border-border/80 px-3 py-2 text-sm text-foreground">
              <input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} />
              {t("inventory.lowOnly")}
            </label>
            <button type="button" onClick={onRefreshProducts}>
              {t("inventory.refresh")}
            </button>
          </>
        }
      />

      <SurfaceCard title={t("inventory.addProduct")} subtitle={t("inventory.addProductSubtitle")}>
        {barcodeMatched ? <p className="mb-2 mt-0 text-xs text-sky-200">{t("inventory.barcodeMatched")}</p> : null}
        <div className="grid gap-2 xl:grid-cols-[1.1fr_1.6fr_0.7fr_0.9fr_0.9fr_0.7fr_1fr_auto]">
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("inventory.barcodeOptional")}
            <input value={newBarcode} onChange={(event) => setNewBarcode(event.target.value)} />
          </label>
          <div className="relative">
            <label className="m-0 block text-sm font-medium text-foreground">
              {t("inventory.productName")}
              <input value={newName} onChange={(event) => setNewName(event.target.value)} />
            </label>
            {newName.trim() ? (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-slate-600 bg-slate-900 text-slate-100">
                {nameSuggestions.length === 0 ? (
                  <p className="m-0 px-3 py-2 text-sm text-slate-300">{t("inventory.noMatching")}</p>
                ) : (
                  nameSuggestions.map((product) => (
                    <div
                      key={product.barcode_id}
                      role="button"
                      tabIndex={0}
                      className="flex w-full flex-col items-start gap-0.5 border-0 border-b border-slate-700 bg-slate-900 px-3 py-2 text-left text-[15px] text-slate-100 hover:bg-slate-800 focus:bg-slate-800"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setNewName(product.name);
                        setNewBarcode(product.barcode_id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setNewName(product.name);
                          setNewBarcode(product.barcode_id);
                        }
                      }}
                    >
                      <span className="font-semibold text-slate-100">{product.name}</span>
                      <span className="text-sm text-slate-300">
                          {product.barcode_id} | {t("inventory.sell")} {Number(product.sell_price).toFixed(2)} | {t("inventory.stock")} {Number(product.stock).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("inventory.qty")}
            <input className="no-spinner" type="number" min="0" step="1" value={newQty} onChange={(event) => setNewQty(event.target.value)} />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("inventory.buyPrice")}
            <input
              className="no-spinner"
              type="number"
              min="0"
              step="0.01"
              value={newBuyPrice}
              onChange={(event) => setNewBuyPrice(event.target.value)}
            />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("inventory.sellPrice")}
            <input
              className="no-spinner"
              type="number"
              min="0"
              step="0.01"
              value={newSellPrice}
              onChange={(event) => setNewSellPrice(event.target.value)}
            />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("inventory.discPct")}
            <input className="no-spinner" type="number" min="0" max="100" step="0.01" value={newDiscPct} onChange={(event) => setNewDiscPct(event.target.value)} />
          </label>
          <label className="m-0 block text-sm font-medium text-foreground">
            {t("inventory.cardSurcharge")}
            <input
              className="no-spinner"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={newCardSurchargePct}
              onChange={(event) => setNewCardSurchargePct(event.target.value)}
            />
          </label>
          <button type="button" onClick={() => void addProductRow()}>
            {barcodeMatched ? t("inventory.update") : t("inventory.add")}
          </button>
        </div>
      </SurfaceCard>

      {isSuperAdmin ? (
        <SurfaceCard title={t("inventory.removeProduct")} subtitle={t("inventory.removeSubtitle")}>
          <div className="grid gap-2 xl:grid-cols-[1.1fr_1.6fr_auto]">
            <label className="m-0 block text-sm font-medium text-foreground">
              {t("inventory.barcode")}
              <input
                value={removeBarcode}
                onChange={(event) => {
                  setRemoveBarcode(event.target.value);
                  if (!event.target.value.trim()) {
                    setRemoveName("");
                  }
                }}
              />
            </label>
            <div className="relative">
              <label className="m-0 block text-sm font-medium text-foreground">
                {t("inventory.productName")}
                <input
                  value={removeName}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setRemoveName(nextName);
                    const exact = products.find((product) => product.name.toLowerCase() === nextName.trim().toLowerCase());
                    if (exact) {
                      setRemoveBarcode(exact.barcode_id);
                    } else if (!nextName.trim()) {
                      setRemoveBarcode("");
                    }
                  }}
                />
              </label>
              {removeName.trim() ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-slate-600 bg-slate-900 text-slate-100">
                  {removeNameSuggestions.length === 0 ? (
                    <p className="m-0 px-3 py-2 text-sm text-slate-300">{t("inventory.noMatching")}</p>
                  ) : (
                    removeNameSuggestions.map((product) => (
                      <div
                        key={`remove-${product.barcode_id}`}
                        role="button"
                        tabIndex={0}
                        className="flex w-full flex-col items-start gap-0.5 border-0 border-b border-slate-700 bg-slate-900 px-3 py-2 text-left text-[15px] text-slate-100 hover:bg-slate-800 focus:bg-slate-800"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setRemoveName(product.name);
                          setRemoveBarcode(product.barcode_id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setRemoveName(product.name);
                            setRemoveBarcode(product.barcode_id);
                          }
                        }}
                      >
                        <span className="font-semibold text-slate-100">{product.name}</span>
                        <span className="text-sm text-slate-300">
                          {product.barcode_id} | {t("inventory.sell")} {Number(product.sell_price).toFixed(2)} | {t("inventory.stock")} {Number(product.stock).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <button type="button" className="danger" onClick={() => void removeProductRow()}>
              {t("inventory.remove")}
            </button>
          </div>
        </SurfaceCard>
      ) : null}

      {isSuperAdmin ? (
        <SurfaceCard title={t("inventory.superTools")} subtitle={t("inventory.superToolsSubtitle")}>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <label className="m-0 block text-sm font-medium text-foreground">
              {t("inventory.importPath")}
              <input
                value={importFilePath}
                onChange={(event) => setImportFilePath(event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                const picked = await onPickImportFile();
                if (picked) {
                  setImportFilePath(picked);
                }
              }}
            >
              {t("inventory.browseFile")}
            </button>
            <button type="button" onClick={() => onImportInventory(importFilePath)}>
              {t("inventory.import")}
            </button>
            <button type="button" onClick={onExportInventory}>
              {t("inventory.export")}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onOpenExportFolder}>
              {t("inventory.openExport")}
            </button>
            <button type="button" className="danger" onClick={onClearInventory}>
              {t("inventory.clearAll")}
            </button>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <SurfaceCard title={t("inventory.totalProducts")} contentClassName="pt-3">
          <p className="m-0 text-2xl font-semibold text-foreground">{products.length}</p>
        </SurfaceCard>
        <SurfaceCard title={t("inventory.lowStock")} contentClassName="pt-3">
          <p className="m-0 text-2xl font-semibold text-amber-300">{lowStockCount}</p>
        </SurfaceCard>
        <SurfaceCard title={t("inventory.outOfStock")} contentClassName="pt-3">
          <p className="m-0 text-2xl font-semibold text-rose-300">{outOfStockCount}</p>
        </SurfaceCard>
      </div>

      <SurfaceCard title={t("inventory.products")} className="overflow-hidden" contentClassName="p-0">
        <table className="m-0">
          <thead>
            <tr>
              <th>{t("inventory.barcode")}</th>
              <th>{t("inventory.productName")}</th>
              <th>{t("inventory.qty")}</th>
              <th>{t("inventory.buyPrice")}</th>
              <th>{t("inventory.sellPrice")}</th>
              <th>{t("inventory.discPct")}</th>
              <th>{t("inventory.cardSurcharge")}</th>
              <th>{t("inventory.status")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  {t("inventory.noMatch")}
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const stockValue = Number(product.stock);
                const status = stockValue <= 0 ? t("inventory.statusOut") : stockValue <= 5 ? t("inventory.statusLow") : t("inventory.statusHealthy");
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
