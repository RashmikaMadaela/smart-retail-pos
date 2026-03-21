import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import { getSaleWithItems } from "./salesService";
import type { ServiceResult } from "../types";

const moduleDir = typeof __dirname === "string" ? __dirname : process.cwd();

type BarcodePdfItem = {
  product_id: string;
  name?: string;
  qty: number;
  sell_price?: number;
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
  const explicitBuildLogo = path.resolve(process.cwd(), "build", "app logo.png");
  if (fs.existsSync(explicitBuildLogo)) {
    return explicitBuildLogo;
  }

  const searchRoots = [
    process.cwd(),
    path.resolve(moduleDir, ".."),
    path.resolve(moduleDir, "../.."),
  ];

  const filenameCandidates = ["floreopos-logo.png", "app logo.png", "logo.jpeg", "logo.jpg", "logo.png", "logo.webp"];
  const bundledLogoCandidates = searchRoots.flatMap((root) => [
    ...filenameCandidates.map((name) => path.resolve(root, "build", name)),
    ...filenameCandidates.map((name) => path.resolve(root, "dist", name)),
    ...filenameCandidates.map((name) => path.resolve(root, "renderer/public", name)),
  ]);

  const bundledLogo = bundledLogoCandidates.find((candidate) => fs.existsSync(candidate));
  if (bundledLogo) {
    return bundledLogo;
  }

  const envLogoPath = process.env.POS_BILL_LOGO_PATH;
  if (envLogoPath && fs.existsSync(envLogoPath)) {
    return envLogoPath;
  }

  return null;
}

function resolveBillFontPath() {
  const envFontPath = process.env.POS_BILL_FONT_PATH;
  if (envFontPath && fs.existsSync(envFontPath)) {
    return envFontPath;
  }

  const candidates = [
    "C:/Windows/Fonts/Nirmala.ttf",
    "C:/Windows/Fonts/iskpota.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansSinhala-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansSinhala-Regular.ttf",
    "/Library/Fonts/NotoSansSinhala-Regular.ttf",
  ];

  return candidates.find((fontPath) => fs.existsSync(fontPath)) || null;
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
    const pageWidth = mmToPt(80);
    const horizontalPadding = 10;
    const usableWidth = pageWidth - horizontalPadding * 2;
    const lineHeight = 14;
    const rowHeight = 16;
    const estimatedHeight = Math.max(520, 300 + payload.items.length * 30);

    const doc = new PDFDocument({ size: [pageWidth, estimatedHeight], margin: 0 });
    const billFontPath = resolveBillFontPath();
    if (billFontPath) {
      doc.registerFont("BillSinhala", billFontPath);
    }

    const setFont = (bold = false) => {
      if (billFontPath) {
        doc.font("BillSinhala");
        return;
      }
      doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    };

    const drawDivider = (y: number) => {
      doc
        .moveTo(horizontalPadding, y)
        .lineTo(pageWidth - horizontalPadding, y)
        .lineWidth(0.6)
        .strokeColor("#8b8b8b")
        .stroke();
    };

    const drawAmountRow = (label: string, value: string, y: number, bold = false) => {
      setFont(bold);
      doc.fontSize(bold ? 11 : 10);
      doc.fillColor("#111111").text(label, horizontalPadding, y, { width: usableWidth * 0.58, align: "left" });
      doc.text(value, horizontalPadding + usableWidth * 0.58, y, { width: usableWidth * 0.42, align: "right" });
    };

    let y = 12;
    const logoPath = resolveBillLogoPath();
    if (logoPath) {
      try {
        const logoWidth = Math.min(usableWidth * 0.96, 190);
        const x = (pageWidth - logoWidth) / 2;
        doc.image(logoPath, x, y, { fit: [logoWidth, 96], align: "center" });
        y += 102;
      } catch {
        // Ignore logo rendering errors and continue with text receipt.
      }
    }

    drawDivider(y);
    y += 6;

    const metaLabelLeftX = horizontalPadding;
    const metaValueLeftX = horizontalPadding + usableWidth * 0.34;
    const metaLabelRightX = horizontalPadding + usableWidth * 0.62;
    const metaValueRightX = horizontalPadding + usableWidth * 0.80;

    setFont(true);
    doc.fontSize(10).text("බිල් අංකය", metaLabelLeftX, y, { width: usableWidth * 0.30, lineBreak: false });
    setFont();
    doc.fontSize(10).text(String(payload.sale.id), metaValueLeftX, y, {
      width: usableWidth * 0.24,
      align: "left",
      lineBreak: false,
    });
    setFont(true);
    doc.text("වේලාව", metaLabelRightX, y, { width: usableWidth * 0.17, lineBreak: false });
    setFont();
    doc.text(String(payload.sale.timestamp).slice(11, 16), metaValueRightX, y, {
      width: usableWidth * 0.20,
      align: "right",
      lineBreak: false,
    });
    y += lineHeight;

    setFont(true);
    doc.text("දිනය", metaLabelLeftX, y, { width: usableWidth * 0.30, lineBreak: false });
    setFont();
    doc.text(String(payload.sale.timestamp).slice(0, 10), metaValueLeftX, y, {
      width: usableWidth * 0.24,
      align: "left",
      lineBreak: false,
    });
    setFont(true);
    doc.text("කැෂියර්", metaLabelRightX, y, { width: usableWidth * 0.17, lineBreak: false });
    setFont();
    doc.text(payload.sale.cashier || "admin", metaValueRightX, y, {
      width: usableWidth * 0.20,
      align: "right",
      lineBreak: false,
    });
    y += lineHeight + 4;

    drawDivider(y);
    y += 6;

    const unitSellX = horizontalPadding + usableWidth * 0.34;
    const unitDiscountedX = horizontalPadding + usableWidth * 0.56;
    const qtyX = horizontalPadding + usableWidth * 0.74;
    const totalX = horizontalPadding + usableWidth * 0.86;

    setFont(true);
    doc.fontSize(8.4);
    doc.text("භාණ්ඩය", horizontalPadding, y, { width: usableWidth * 0.33 });
    doc.text("විකුණුම් මිල", unitSellX, y, { width: usableWidth * 0.21, align: "right" });
    doc.text("අපේ මිල", unitDiscountedX, y, { width: usableWidth * 0.17, align: "right" });
    doc.text("ප්‍ර.", qtyX, y, { width: usableWidth * 0.11, align: "right" });
    doc.text("මුළු", totalX, y, { width: usableWidth * 0.14, align: "right" });
    y += lineHeight;
    drawDivider(y);
    y += 6;

    const itemLevelSavings = payload.items.reduce(
      (sum, item) => sum + Number(item.item_discount || 0) * Number(item.qty || 0),
      0,
    );
    const surchargeTotal = payload.items.reduce(
      (sum, item) => sum + Number(item.applied_surcharge || 0) * Number(item.qty || 0),
      0,
    );

    for (const item of payload.items) {
      const name = item.name || item.product_id;
      const sellUnitPrice = Number(item.sold_at_price || 0);
      const discountedUnitPrice = Math.max(0, sellUnitPrice - Number(item.item_discount || 0));
      const lineTotal = Number(item.qty) * discountedUnitPrice;

      setFont(true);
      doc.fontSize(9).text(name, horizontalPadding, y, { width: usableWidth });
      y += lineHeight;
      setFont();
      doc.fontSize(9.4);
      doc.text(sellUnitPrice.toFixed(2), unitSellX, y, { width: usableWidth * 0.21, align: "right" });
      doc.text(discountedUnitPrice.toFixed(2), unitDiscountedX, y, { width: usableWidth * 0.17, align: "right" });
      doc.text(Number(item.qty).toFixed(2), qtyX, y, { width: usableWidth * 0.11, align: "right" });
      doc.text(lineTotal.toFixed(2), totalX, y, { width: usableWidth * 0.14, align: "right" });
      y += rowHeight;
    }

    drawDivider(y);
    y += 8;

    const totalSaved = Number(payload.sale.discount || 0) + itemLevelSavings;

    drawAmountRow("මුළු බිල් මුදල", Number(payload.sale.total).toFixed(2), y, true);
    y += lineHeight;
    drawAmountRow("ඉතිරි කළ මුදල", totalSaved.toFixed(2), y);
    y += lineHeight;
    if (surchargeTotal > 0) {
      drawAmountRow("කාඩ් අමතර ගාස්තු", surchargeTotal.toFixed(2), y);
      y += lineHeight;
    }
    drawAmountRow("මුල් එකතුව", Number(payload.sale.subtotal).toFixed(2), y);
    y += lineHeight + 4;

    drawDivider(y);
    y += 8;

    const paid = Number(payload.sale.paid_amount || 0);
    const cardPaid = String(payload.sale.payment_method || "").toUpperCase() === "CARD" ? paid : 0;
    const cashPaid = String(payload.sale.payment_method || "").toUpperCase() === "CASH" ? paid : 0;

    drawAmountRow("ගෙවීම්", "", y, true);
    y += lineHeight;
    drawAmountRow("මුදල්", cashPaid.toFixed(2), y);
    y += lineHeight;
    drawAmountRow("කාඩ්", cardPaid.toFixed(2), y);
    y += lineHeight + 4;

    drawDivider(y);
    y += 8;
    drawAmountRow("ඉතිරි ගෙවිය යුතු", Number(payload.sale.balance_due).toFixed(2), y, true);
    y += lineHeight + 8;

    setFont();
    doc.fontSize(8.5).fillColor("#2a2a2a").text(
      process.env.POS_BILL_RETURN_POLICY || "විකුණූ භාණ්ඩ දින 03කට පසු ආපසු භාර නොගනියි.",
      horizontalPadding,
      y,
      { width: usableWidth, align: "center" },
    );
    y += lineHeight * 2;
    drawDivider(y);
    y += 10;

    setFont(true);
    doc.fontSize(10).fillColor("#111111").text("ඔබගේ පැමිණීමට ස්තුතියි", horizontalPadding, y, {
      width: usableWidth,
      align: "center",
    });
    y += lineHeight;
    setFont();
    doc.fontSize(8.5).fillColor("#4b4b4b").text(
      process.env.POS_BILL_FOOTER || "FloreoPOS මගින් බලගන්වයි",
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
        sell_price: Number(item.sell_price ?? 0),
      }))
      .filter((item) => item.product_id && Number.isFinite(item.qty) && item.qty > 0);

    if (normalized.length === 0) {
      return { ok: false, error: "No valid barcode labels to print." };
    }

    const printRoot = resolvePrintRoot();
    const barcodeDir = path.join(printRoot, "barcodes");
    await ensureDir(barcodeDir);

    const outputPath = path.join(barcodeDir, `barcode-labels-${nowStamp()}.pdf`);
    const mmToPt = (mm: number) => mm * 2.834645669;
    const labelWidth = mmToPt(38);
    const labelHeight = mmToPt(25);
    const padding = mmToPt(1.5);
    const doc = new PDFDocument({ size: [labelWidth, labelHeight], margin: 0 });

    let labelCount = 0;

    for (const item of normalized) {
      const labelQty = Math.max(1, Math.round(item.qty));
      for (let i = 0; i < labelQty; i += 1) {
        if (labelCount > 0) {
          doc.addPage({ size: [labelWidth, labelHeight], margin: 0 });
        }

        const png = await bwipjs.toBuffer({
          bcid: "code128",
          text: item.product_id,
          scale: 1,
          height: 8,
          includetext: false,
          paddingwidth: 0,
          paddingheight: 0,
        });

        doc.rect(0, 0, labelWidth, labelHeight).lineWidth(0.5).strokeColor("#d8d8d8").stroke();
        doc.font("Helvetica-Bold").fontSize(6.6).fillColor("#111111").text(item.name || item.product_id, padding, padding, {
          width: labelWidth - padding * 2,
          height: mmToPt(4),
          ellipsis: true,
        });
        doc.font("Helvetica").fontSize(6.4).fillColor("#222222").text(`Price: ${Number(item.sell_price || 0).toFixed(2)}`, padding, padding + mmToPt(4.2), {
          width: labelWidth - padding * 2,
        });
        doc.image(png, padding, padding + mmToPt(8), {
          fit: [labelWidth - padding * 2, mmToPt(11)],
          align: "center",
        });
        doc.font("Helvetica").fontSize(6.1).fillColor("#111111").text(item.product_id, padding, labelHeight - mmToPt(4.2), {
          width: labelWidth - padding * 2,
          align: "center",
        });

        labelCount += 1;
      }
    }

    await writePdf(doc, outputPath);
    return { ok: true, data: { file_path: outputPath, labels: labelCount } };
  } catch (error) {
    return { ok: false, error: `Error: ${String((error as Error).message || error)}` };
  }
}
