import os
from datetime import datetime
from typing import Dict, Optional

from database import queries


def _receipt_dir() -> str:
    base = os.path.join(os.path.dirname(os.path.dirname(__file__)), "receipts")
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
