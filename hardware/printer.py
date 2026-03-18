import os
from datetime import datetime
from io import BytesIO
from typing import Dict, Optional

from database import queries


def _receipt_dir() -> str:
    base = os.path.join(os.path.dirname(os.path.dirname(__file__)), "receipts")
    os.makedirs(base, exist_ok=True)
    return base


def _sticker_dir() -> str:
    base = os.path.join(_receipt_dir(), "stickers")
    os.makedirs(base, exist_ok=True)
    return base


def build_receipt_text(payload: Dict) -> str:
    sale = payload["sale"]
    items = payload["items"]

    lines = []
    lines.append("PRIYANKA STORES")
    lines.append("------------------------------")
    lines.append(f"Invoice: {sale['id']}")
    lines.append(f"Date: {sale['timestamp']}")
    lines.append(f"Cashier: {sale.get('cashier') or 'N/A'}")
    if sale.get("customer_name"):
        lines.append(f"Customer: {sale['customer_name']} ({sale.get('customer_contact') or '-'})")
    lines.append("------------------------------")
    lines.append("Item              Qty   Total")
    lines.append("------------------------------")

    for item in items:
        name = (item.get("name") or item["product_id"])[:16]
        qty = float(item["qty"])
        unit = float(item["sold_at_price"])
        disc = float(item.get("item_discount") or 0.0)
        line_total = qty * max(0.0, (unit - disc))
        lines.append(f"{name:<16} {qty:>4.1f} {line_total:>7.2f}")

    lines.append("------------------------------")
    lines.append(f"Subtotal:      Rs. {float(sale['subtotal']):.2f}")
    lines.append(f"Discount:      Rs. {float(sale['discount']):.2f}")
    lines.append(f"Total:         Rs. {float(sale['total']):.2f}")
    lines.append(f"Paid:          Rs. {float(sale['paid_amount']):.2f}")
    lines.append(f"Balance:       Rs. {float(sale['balance_due']):.2f}")
    lines.append(f"Payment:       {sale.get('payment_status') or 'PAID'}")
    lines.append("------------------------------")
    lines.append("Thank you for shopping")
    lines.append(datetime.now().strftime("Generated %Y-%m-%d %H:%M:%S"))
    return "\n".join(lines) + "\n"


def save_receipt_text(receipt_text: str, sale_id: int) -> str:
    file_path = os.path.join(_receipt_dir(), f"receipt_{int(sale_id)}.txt")
    with open(file_path, "w", encoding="utf-8") as handle:
        handle.write(receipt_text)
    return file_path


def _safe_token(value: str) -> str:
    token = "".join(ch for ch in (value or "") if ch.isalnum() or ch in {"-", "_"})
    return token or "product"


def _build_sticker_image(product: Dict, copies: int) -> Dict:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except Exception as err:
        return {
            "ok": False,
            "detail": f"Pillow unavailable for sticker generation: {err}",
        }

    try:
        from barcode import Code128
        from barcode.writer import ImageWriter
    except Exception as err:
        return {
            "ok": False,
            "detail": f"python-barcode unavailable for sticker generation: {err}",
        }

    label_width = 620
    label_height = 250
    sheet = Image.new("RGB", (label_width, label_height * copies), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    barcode_obj = Code128(str(product["barcode_id"]), writer=ImageWriter())
    barcode_buffer = BytesIO()
    barcode_obj.write(
        barcode_buffer,
        options={
            "module_width": 0.2,
            "module_height": 36.0,
            "quiet_zone": 2.0,
            "font_size": 11,
            "text_distance": 2.0,
            "dpi": 200,
        },
    )
    barcode_buffer.seek(0)
    barcode_img = Image.open(barcode_buffer).convert("RGB")
    barcode_img = barcode_img.resize((540, 130))

    product_name = str(product.get("name") or "Item")
    sell_price = float(product.get("sell_price") or 0.0)

    for index in range(copies):
        top = index * label_height
        draw.rectangle([(10, top + 10), (label_width - 10, top + label_height - 10)], outline="black", width=2)
        name_line = product_name[:48]
        draw.text((24, top + 22), f"{name_line}", fill="black", font=font)
        draw.text((24, top + 42), f"ID: {product['barcode_id']}", fill="black", font=font)
        draw.text((24, top + 62), f"MRP: Rs. {sell_price:.2f}", fill="black", font=font)
        sheet.paste(barcode_img, (40, top + 90))

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"sticker_{_safe_token(str(product['barcode_id']))}_{stamp}.png"
    file_path = os.path.join(_sticker_dir(), filename)
    sheet.save(file_path, format="PNG")
    return {"ok": True, "path": file_path}


def _save_sticker_text(product: Dict, copies: int) -> str:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(
        _sticker_dir(),
        f"sticker_{_safe_token(str(product['barcode_id']))}_{stamp}.txt",
    )
    lines = [
        "STICKER FALLBACK",
        f"Product ID: {product['barcode_id']}",
        f"Product Name: {product.get('name') or '-'}",
        f"Price: Rs. {float(product.get('sell_price') or 0.0):.2f}",
        f"Copies: {int(copies)}",
        datetime.now().strftime("Generated %Y-%m-%d %H:%M:%S"),
    ]
    with open(file_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    return file_path


def _parse_usb_id(value: str) -> Optional[int]:
    if not value:
        return None
    try:
        value = value.strip().lower()
        if value.startswith("0x"):
            return int(value, 16)
        return int(value)
    except ValueError:
        return None


def try_print_escpos(receipt_text: str) -> Dict:
    vendor = _parse_usb_id(os.environ.get("POS_PRINTER_VENDOR_ID", ""))
    product = _parse_usb_id(os.environ.get("POS_PRINTER_PRODUCT_ID", ""))

    if vendor is None or product is None:
        return {
            "ok": False,
            "mode": "escpos",
            "detail": "ESC/POS printer IDs are not configured in environment.",
        }

    try:
        from escpos.printer import Usb
    except Exception as err:
        return {
            "ok": False,
            "mode": "escpos",
            "detail": f"python-escpos unavailable: {err}",
        }

    try:
        printer = Usb(vendor, product, 0)
        printer.text(receipt_text)
        printer.cut()
        return {"ok": True, "mode": "escpos", "detail": "Printed to ESC/POS device."}
    except Exception as err:
        return {"ok": False, "mode": "escpos", "detail": f"ESC/POS print failed: {err}"}


def try_print_escpos_image(image_path: str) -> Dict:
    vendor = _parse_usb_id(os.environ.get("POS_PRINTER_VENDOR_ID", ""))
    product = _parse_usb_id(os.environ.get("POS_PRINTER_PRODUCT_ID", ""))

    if vendor is None or product is None:
        return {
            "ok": False,
            "mode": "escpos",
            "detail": "ESC/POS printer IDs are not configured in environment.",
        }

    try:
        from escpos.printer import Usb
    except Exception as err:
        return {
            "ok": False,
            "mode": "escpos",
            "detail": f"python-escpos unavailable: {err}",
        }

    try:
        printer = Usb(vendor, product, 0)
        printer.image(image_path)
        printer.cut()
        return {"ok": True, "mode": "escpos", "detail": "Printed label to ESC/POS device."}
    except Exception as err:
        return {"ok": False, "mode": "escpos", "detail": f"ESC/POS label print failed: {err}"}


def generate_and_print_receipt(sale_id: int) -> Dict:
    payload = queries.get_sale_with_items(int(sale_id))
    if not payload:
        return {"ok": False, "mode": "none", "detail": "Sale not found for receipt."}

    receipt_text = build_receipt_text(payload)
    escpos_result = try_print_escpos(receipt_text)
    if escpos_result.get("ok"):
        return escpos_result

    file_path = save_receipt_text(receipt_text, int(sale_id))
    return {
        "ok": True,
        "mode": "file",
        "path": file_path,
        "detail": escpos_result.get("detail", "Saved receipt to file fallback."),
    }


def generate_and_print_product_sticker(product_id: str, copies: int = 1) -> Dict:
    product = queries.get_product((product_id or "").strip())
    if not product:
        return {"ok": False, "mode": "none", "detail": "Product not found for sticker."}

    try:
        copies = int(copies)
    except (TypeError, ValueError):
        return {"ok": False, "mode": "none", "detail": "Copies must be a whole number."}

    if copies < 1 or copies > 100:
        return {"ok": False, "mode": "none", "detail": "Copies must be between 1 and 100."}

    image_result = _build_sticker_image(product, copies)
    if not image_result.get("ok"):
        file_path = _save_sticker_text(product, copies)
        return {
            "ok": True,
            "mode": "file",
            "path": file_path,
            "detail": image_result.get("detail", "Saved sticker text fallback."),
        }

    image_path = image_result["path"]
    escpos_result = try_print_escpos_image(image_path)
    if escpos_result.get("ok"):
        return escpos_result

    return {
        "ok": True,
        "mode": "file",
        "path": image_path,
        "detail": escpos_result.get("detail", "Saved sticker image to file fallback."),
    }
