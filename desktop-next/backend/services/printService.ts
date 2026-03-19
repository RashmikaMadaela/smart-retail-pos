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

function resolveBillLogoPath() {
  const searchRoots = [
    process.cwd(),
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "../.."),
  ];

  const filenameCandidates = ["logo.jpeg", "logo.jpg", "logo.png", "logo.webp"];
  const defaultLogoCandidates = searchRoots.flatMap((root) => [
    ...filenameCandidates.map((name) => path.resolve(root, "renderer/public", name)),
    ...filenameCandidates.map((name) => path.resolve(root, "dist", name)),
  ]);

  const defaultLogo = defaultLogoCandidates.find((candidate) => fs.existsSync(candidate));
  if (defaultLogo) {
    return defaultLogo;
  }

  const envLogoPath = process.env.POS_BILL_LOGO_PATH;
  if (envLogoPath && fs.existsSync(envLogoPath)) {
    return envLogoPath;
  }

  return null;
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
    const mmToPt = (mm: number) => mm * 2.834645669;
    const pageWidth = mmToPt(78);
    const horizontalPadding = 10;
    const usableWidth = pageWidth - horizontalPadding * 2;
    const lineHeight = 14;
    const rowHeight = 16;
    const estimatedHeight = Math.max(520, 300 + payload.items.length * 30);

    const doc = new PDFDocument({ size: [pageWidth, estimatedHeight], margin: 0 });

    const drawDivider = (y: number) => {
      doc
        .moveTo(horizontalPadding, y)
        .lineTo(pageWidth - horizontalPadding, y)
        .lineWidth(0.6)
        .strokeColor("#8b8b8b")
        .stroke();
    };

    const drawAmountRow = (label: string, value: string, y: number, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 10);
      doc.fillColor("#111111").text(label, horizontalPadding, y, { width: usableWidth * 0.58, align: "left" });
      doc.text(value, horizontalPadding + usableWidth * 0.58, y, { width: usableWidth * 0.42, align: "right" });
    };

    let y = 12;
    const logoPath = resolveBillLogoPath();
    if (logoPath) {
      try {
        const logoWidth = Math.min(usableWidth * 0.62, 130);
        const x = (pageWidth - logoWidth) / 2;
        doc.image(logoPath, x, y, { fit: [logoWidth, 70], align: "center" });
        y += 76;
      } catch {
        // Ignore logo rendering errors and continue with text receipt.
      }
    }

    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#111111").text(process.env.POS_BILL_STORE_NAME || "Priyanka Stores", horizontalPadding, y, {
      width: usableWidth,
      align: "center",
    });
    y += lineHeight;
    doc.font("Helvetica").fontSize(9).text(process.env.POS_BILL_STORE_LOCATION || "Polonnaruwa", horizontalPadding, y, {
      width: usableWidth,
      align: "center",
    });
    y += lineHeight;
    doc.text(process.env.POS_BILL_STORE_PHONE || "0700000000", horizontalPadding, y, { width: usableWidth, align: "center" });
    y += lineHeight;
    doc.text(process.env.POS_BILL_STORE_EMAIL || "info@example.com", horizontalPadding, y, { width: usableWidth, align: "center" });
    y += lineHeight + 3;

    drawDivider(y);
    y += 6;

    doc.font("Helvetica-Bold").fontSize(10).text("INV NO", horizontalPadding, y, { width: usableWidth * 0.32 });
    doc.font("Helvetica").fontSize(10).text(String(payload.sale.id), horizontalPadding + usableWidth * 0.35, y, {
      width: usableWidth * 0.22,
      align: "left",
    });
    doc.font("Helvetica-Bold").text("TIME", horizontalPadding + usableWidth * 0.58, y, { width: usableWidth * 0.18 });
    doc.font("Helvetica").text(String(payload.sale.timestamp).slice(11, 16), horizontalPadding + usableWidth * 0.78, y, {
      width: usableWidth * 0.22,
      align: "right",
    });
    y += lineHeight;

    doc.font("Helvetica-Bold").text("DATE", horizontalPadding, y, { width: usableWidth * 0.32 });
    doc.font("Helvetica").text(String(payload.sale.timestamp).slice(0, 10), horizontalPadding + usableWidth * 0.35, y, {
      width: usableWidth * 0.22,
      align: "left",
    });
    doc.font("Helvetica-Bold").text("BY", horizontalPadding + usableWidth * 0.58, y, { width: usableWidth * 0.18 });
    doc.font("Helvetica").text(payload.sale.cashier || "admin", horizontalPadding + usableWidth * 0.78, y, {
      width: usableWidth * 0.22,
      align: "right",
    });
    y += lineHeight + 4;

    drawDivider(y);
    y += 6;

    doc.font("Helvetica-Bold").fontSize(9.5);
    doc.text("ITEM", horizontalPadding, y, { width: usableWidth * 0.44 });
    doc.text("QTY", horizontalPadding + usableWidth * 0.45, y, { width: usableWidth * 0.14, align: "right" });
    doc.text("DIS", horizontalPadding + usableWidth * 0.61, y, { width: usableWidth * 0.14, align: "right" });
    doc.text("TOTAL", horizontalPadding + usableWidth * 0.77, y, { width: usableWidth * 0.23, align: "right" });
    y += lineHeight;
    drawDivider(y);
    y += 6;

    for (const item of payload.items) {
      const name = item.name || item.product_id;
      const lineTotal = Number(item.qty) * Math.max(0, Number(item.sold_at_price) - Number(item.item_discount));

      doc.font("Helvetica-Bold").fontSize(9.5).text(name, horizontalPadding, y, { width: usableWidth });
      y += lineHeight;
      doc.font("Helvetica").fontSize(10);
      doc.text(Number(item.qty).toFixed(2), horizontalPadding + usableWidth * 0.45, y, { width: usableWidth * 0.14, align: "right" });
      doc.text(Number(item.item_discount).toFixed(2), horizontalPadding + usableWidth * 0.61, y, { width: usableWidth * 0.14, align: "right" });
      doc.text(lineTotal.toFixed(2), horizontalPadding + usableWidth * 0.77, y, { width: usableWidth * 0.23, align: "right" });
      y += rowHeight;
    }

    drawDivider(y);
    y += 8;

    drawAmountRow("GROSS PRICE", Number(payload.sale.subtotal).toFixed(2), y);
    y += lineHeight;
    drawAmountRow("DISCOUNT", Number(payload.sale.discount).toFixed(2), y);
    y += lineHeight;
    drawAmountRow("TOTAL", Number(payload.sale.total).toFixed(2), y, true);
    y += lineHeight + 4;

    drawDivider(y);
    y += 8;

    const paid = Number(payload.sale.paid_amount || 0);
    const cardPaid = String(payload.sale.payment_method || "").toUpperCase() === "CARD" ? paid : 0;
    const cashPaid = String(payload.sale.payment_method || "").toUpperCase() === "CASH" ? paid : 0;

    drawAmountRow("PAYMENT", "", y, true);
    y += lineHeight;
    drawAmountRow("CASH", cashPaid.toFixed(2), y);
    y += lineHeight;
    drawAmountRow("CARD", cardPaid.toFixed(2), y);
    y += lineHeight + 4;

    drawDivider(y);
    y += 8;
    drawAmountRow("BALANCE", Number(payload.sale.balance_due).toFixed(2), y, true);
    y += lineHeight + 8;

    doc.font("Helvetica").fontSize(8.5).fillColor("#2a2a2a").text(
      process.env.POS_BILL_RETURN_POLICY || "ITEMS SOLD ARE NOT RETURNABLE AFTER 03 DAYS.",
      horizontalPadding,
      y,
      { width: usableWidth, align: "center" },
    );
    y += lineHeight * 2;
    drawDivider(y);
    y += 10;

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text("Thank you for your visit", horizontalPadding, y, {
      width: usableWidth,
      align: "center",
    });
    y += lineHeight;
    doc.font("Helvetica").fontSize(8.5).fillColor("#4b4b4b").text(
      process.env.POS_BILL_FOOTER || "Powered by Smart Retail POS Next",
      horizontalPadding,
      y,
      { width: usableWidth, align: "center" },
    );

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
