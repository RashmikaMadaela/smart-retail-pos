import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import { getSaleWithItems } from "./salesService";
import type { ServiceResult } from "../types";

type BarcodePdfItem = {
  product_id: string;
  name?: string;
  qty: number;
};

type BarcodePdfInput = {
  items: BarcodePdfItem[];
};

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function resolvePrintRoot() {
  return process.env.POS_PRINT_DIR || path.resolve(process.cwd(), "../printouts");
}

async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
}

async function writePdf(doc: PDFKit.PDFDocument, outputPath: string) {
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    stream.on("finish", () => resolve());
    stream.on("error", (error) => reject(error));
    doc.end();
  });
}

export async function exportSaleBillPdf(saleId: number): Promise<ServiceResult<{ file_path: string }>> {
  try {
    const payload = getSaleWithItems(Number(saleId));
    if (!payload) {
      return { ok: false, error: "Sale not found." };
    }

    const printRoot = resolvePrintRoot();
    const billsDir = path.join(printRoot, "bills");
    await ensureDir(billsDir);

    const outputPath = path.join(billsDir, `bill-sale-${saleId}-${nowStamp()}.pdf`);
    const doc = new PDFDocument({ size: "A4", margin: 36 });

    doc.fontSize(18).text("Smart Retail POS Next", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(12).text("Bill Receipt", { align: "left" });
    doc.moveDown(0.8);

    doc.fontSize(10);
    doc.text(`Sale ID: ${payload.sale.id}`);
    doc.text(`Date: ${payload.sale.timestamp}`);
    doc.text(`Cashier: ${payload.sale.cashier || "N/A"}`);
    doc.text(`Customer: ${payload.sale.customer_name || "Walk-in"}`);
    doc.text(`Payment: ${payload.sale.payment_method || "N/A"} (${payload.sale.payment_status || "N/A"})`);

    doc.moveDown(0.8);
    doc.fontSize(10).text("Items", { underline: true });
    doc.moveDown(0.5);

    const headerY = doc.y;
    doc.text("Product", 36, headerY);
    doc.text("Qty", 250, headerY);
    doc.text("Price", 300, headerY);
    doc.text("Disc", 370, headerY);
    doc.text("Total", 440, headerY);

    let y = headerY + 16;
    for (const item of payload.items) {
      const lineTotal = Number(item.qty) * Math.max(0, Number(item.sold_at_price) - Number(item.item_discount));
      doc.text(item.name || item.product_id, 36, y, { width: 210 });
      doc.text(Number(item.qty).toFixed(2), 250, y);
      doc.text(Number(item.sold_at_price).toFixed(2), 300, y);
      doc.text(Number(item.item_discount).toFixed(2), 370, y);
      doc.text(lineTotal.toFixed(2), 440, y);
      y += 16;

      if (y > 730) {
        doc.addPage();
        y = 50;
      }
    }

    y += 12;
    doc.text(`Subtotal: Rs. ${Number(payload.sale.subtotal).toFixed(2)}`, 360, y);
    y += 14;
    doc.text(`Discount: Rs. ${Number(payload.sale.discount).toFixed(2)}`, 360, y);
    y += 14;
    doc.font("Helvetica-Bold").text(`Total: Rs. ${Number(payload.sale.total).toFixed(2)}`, 360, y);
    y += 14;
    doc.font("Helvetica").text(`Paid: Rs. ${Number(payload.sale.paid_amount).toFixed(2)}`, 360, y);
    y += 14;
    doc.text(`Balance: Rs. ${Number(payload.sale.balance_due).toFixed(2)}`, 360, y);

    await writePdf(doc, outputPath);
    return { ok: true, data: { file_path: outputPath } };
  } catch (error) {
    return { ok: false, error: `Error: ${String((error as Error).message || error)}` };
  }
}

export async function exportBarcodePdf(input: BarcodePdfInput): Promise<ServiceResult<{ file_path: string; labels: number }>> {
  try {
    if (!input.items || input.items.length === 0) {
      return { ok: false, error: "No barcode items provided." };
    }

    const normalized = input.items
      .map((item) => ({
        product_id: String(item.product_id || "").trim(),
        name: String(item.name || "").trim(),
        qty: Number(item.qty || 0),
      }))
      .filter((item) => item.product_id && Number.isFinite(item.qty) && item.qty > 0);

    if (normalized.length === 0) {
      return { ok: false, error: "No valid barcode labels to print." };
    }

    const printRoot = resolvePrintRoot();
    const barcodeDir = path.join(printRoot, "barcodes");
    await ensureDir(barcodeDir);

    const outputPath = path.join(barcodeDir, `barcode-labels-${nowStamp()}.pdf`);
    const doc = new PDFDocument({ size: "A4", margin: 36 });

    doc.fontSize(16).text("Smart Retail POS Next", { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(11).text("Barcode Label Export");
    doc.moveDown(0.8);

    let y = doc.y;
    let labelCount = 0;

    for (const item of normalized) {
      const labelQty = Math.max(1, Math.round(item.qty));
      for (let i = 0; i < labelQty; i += 1) {
        if (y > 730) {
          doc.addPage();
          y = 50;
        }

        const png = await bwipjs.toBuffer({
          bcid: "code128",
          text: item.product_id,
          scale: 2,
          height: 10,
          includetext: true,
          textxalign: "center",
        });

        doc.roundedRect(36, y, 250, 86, 6).strokeColor("#c9d2e3").stroke();
        doc.fontSize(9).fillColor("#111111").text(item.name || item.product_id, 46, y + 10, { width: 230 });
        doc.image(png, 46, y + 28, { fit: [220, 45] });

        y += 96;
        labelCount += 1;
      }
    }

    await writePdf(doc, outputPath);
    return { ok: true, data: { file_path: outputPath, labels: labelCount } };
  } catch (error) {
    return { ok: false, error: `Error: ${String((error as Error).message || error)}` };
  }
}
