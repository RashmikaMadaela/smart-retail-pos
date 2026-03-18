from pathlib import Path

import pytest

from database import db_setup, queries
from hardware import printer
from utils import auth


@pytest.fixture()
def isolated_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_pos.db"

    monkeypatch.setattr(queries, "DB_PATH", str(db_path))
    monkeypatch.setattr(db_setup, "DB_PATH", str(db_path))
    monkeypatch.setattr(auth, "DB_PATH", str(db_path))

    db_setup.setup_database()
    return Path(db_path)


def _seed_products():
    ok, product_a = queries.add_product("P100", "Milk Packet", 80.0, 100.0, 10, 2)
    assert ok
    ok, product_b = queries.add_product("", "Loose Rice", 150.0, 200.0, 25.0, 5.0)
    assert ok
    assert product_b.startswith("SYS-")
    return product_a, product_b


def test_verify_login_success_and_failure(isolated_db):
    success, user = auth.verify_login("admin", "admin123")
    assert success is True
    assert user["role"] == "Admin"

    bad_success, bad_user = auth.verify_login("admin", "wrong-password")
    assert bad_success is False
    assert bad_user is None


def test_add_product_generates_sys_id(isolated_db):
    ok, generated = queries.add_product("", "Photocopy A4", 5.0, 10.0, 100.0, 10.0)
    assert ok is True
    assert generated == "SYS-001"

    product = queries.get_product(generated)
    assert product is not None
    assert product["name"] == "Photocopy A4"


def test_process_sale_deducts_stock(isolated_db):
    product_a, _ = _seed_products()

    cart = [{"product_id": product_a, "qty": 2.0, "price": 100.0, "discount": 0.0}]
    ok, sale_id = queries.process_sale(
        cashier_id=1,
        customer_id=None,
        cart_items=cart,
        subtotal=200.0,
        global_discount=0.0,
        total_amount=200.0,
        status="COMPLETED",
        paid_amount=200.0,
        payment_status="PAID",
    )

    assert ok is True
    assert int(sale_id) > 0

    product = queries.get_product(product_a)
    assert float(product["stock"]) == 8.0


def test_process_sale_blocks_oversell(isolated_db):
    product_a, _ = _seed_products()

    cart = [{"product_id": product_a, "qty": 50.0, "price": 100.0, "discount": 0.0}]
    ok, error = queries.process_sale(
        cashier_id=1,
        customer_id=None,
        cart_items=cart,
        subtotal=5000.0,
        global_discount=0.0,
        total_amount=5000.0,
    )

    assert ok is False
    assert "Insufficient stock" in error


def test_hold_and_complete_sale_flow(isolated_db):
    product_a, _ = _seed_products()

    cart = [{"product_id": product_a, "qty": 1.0, "price": 100.0, "discount": 0.0}]

    hold_ok, hold_id = queries.hold_sale(
        cashier_id=1,
        cart_items=cart,
        subtotal=100.0,
        global_discount=0.0,
        total_amount=100.0,
    )
    assert hold_ok is True

    held_list = queries.list_held_sales(cashier_id=1)
    assert any(int(row["id"]) == int(hold_id) for row in held_list)

    complete_ok, _ = queries.complete_held_sale(
        sale_id=int(hold_id),
        customer_id=None,
        paid_amount=100.0,
        payment_status="PAID",
    )
    assert complete_ok is True

    product = queries.get_product(product_a)
    assert float(product["stock"]) == 9.0


def test_credit_and_settlement_updates_outstanding(isolated_db):
    product_a, _ = _seed_products()

    customer_ok, customer = queries.create_or_get_customer("John", "0710000000")
    assert customer_ok is True

    cart = [{"product_id": product_a, "qty": 2.0, "price": 100.0, "discount": 0.0}]
    sale_ok, _ = queries.process_sale(
        cashier_id=1,
        customer_id=customer["id"],
        cart_items=cart,
        subtotal=200.0,
        global_discount=0.0,
        total_amount=200.0,
        status="COMPLETED",
        paid_amount=50.0,
        payment_status="PARTIAL",
    )
    assert sale_ok is True

    customer_after_sale = queries.get_customer(customer["id"])
    assert float(customer_after_sale["total_outstanding"]) == 150.0

    payment_ok, _ = queries.record_customer_payment(customer["id"], 60.0)
    assert payment_ok is True

    customer_after_payment = queries.get_customer(customer["id"])
    assert float(customer_after_payment["total_outstanding"]) == 90.0


def test_process_sale_applies_card_surcharge_for_flagged_item(isolated_db):
    ok, product_id = queries.add_product(
        "S200",
        "Card Fee Item",
        70.0,
        100.0,
        12.0,
        2.0,
        card_surcharge_enabled=True,
        card_surcharge_pct=5.0,
    )
    assert ok is True

    cart = [{"product_id": product_id, "qty": 1.0, "price": 100.0, "discount": 0.0}]
    sale_ok, sale_id = queries.process_sale(
        cashier_id=1,
        customer_id=None,
        cart_items=cart,
        subtotal=100.0,
        global_discount=0.0,
        total_amount=100.0,
        status="COMPLETED",
        paid_amount=105.0,
        payment_status="PAID",
        payment_method="CARD",
    )

    assert sale_ok is True
    payload = queries.get_sale_with_items(int(sale_id))
    assert payload is not None
    assert payload["sale"]["payment_method"] == "CARD"
    assert float(payload["sale"]["total"]) == 105.0
    assert float(payload["items"][0]["applied_surcharge"]) == 5.0


def test_supplier_batch_receive_and_partial_settlement(isolated_db):
    product_id, _ = _seed_products()

    supplier_ok, _ = queries.create_supplier("Acme Foods", contact="0771234567")
    assert supplier_ok is True
    supplier = queries.search_suppliers("Acme Foods", limit=1)[0]
    supplier_id = int(supplier["id"])

    receive_ok, batch_id_text = queries.receive_supplier_batch(
        supplier_id=supplier_id,
        reference_no="BATCH-001",
        items=[
            {
                "product_id": product_id,
                "qty_received": 10.0,
                "unit_cost": 20.0,
                "line_discount_pct": 10.0,
            }
        ],
        paid_amount=50.0,
    )
    assert receive_ok is True

    batch_id = int(batch_id_text)
    product = queries.get_product(product_id)
    assert float(product["stock"]) == 20.0

    pay_ok, _ = queries.record_supplier_payment(
        supplier_id=supplier_id,
        batch_id=batch_id,
        amount=30.0,
        method="BANK",
        note="Manual settlement",
    )
    assert pay_ok is True

    ledger = queries.get_supplier_ledger(supplier_id)
    assert float(ledger["supplier"]["total_outstanding"]) == 100.0
    matching_batch = next(row for row in ledger["batches"] if int(row["id"]) == batch_id)
    assert float(matching_batch["paid_amount"]) == 80.0
    assert float(matching_batch["balance_due"]) == 100.0
    assert matching_batch["status"] == "PARTIAL"
    assert len(ledger["payments"]) == 2


def test_sticker_generation_falls_back_to_text_file(isolated_db, tmp_path, monkeypatch):
    ok, product_id = queries.add_product("LBL-01", "Label Item", 10.0, 25.0, 5.0, 1.0)
    assert ok is True

    fallback_root = tmp_path / "receipts"
    monkeypatch.setattr(printer, "_receipt_dir", lambda: str(fallback_root))
    monkeypatch.setattr(
        printer,
        "_build_sticker_image",
        lambda product, copies: {"ok": False, "detail": "forced image failure"},
    )

    result = printer.generate_and_print_product_sticker(product_id, copies=2)
    assert result["ok"] is True
    assert result["mode"] == "file"
    assert "forced image failure" in result["detail"]

    saved = Path(result["path"])
    assert saved.exists()
    assert saved.suffix == ".txt"
    content = saved.read_text(encoding="utf-8")
    assert "Product ID: LBL-01" in content
    assert "Copies: 2" in content
