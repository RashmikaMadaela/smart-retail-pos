import type { CartItem, Product } from "./types";

type BillingTabProps = {
  products: Product[];
  selectedProductId: string;
  addQty: string;
  cart: CartItem[];
  paymentMode: "PAID" | "PARTIAL" | "UNPAID";
  paymentMethod: "CASH" | "CARD";
  paidAmount: string;
  customerName: string;
  customerContact: string;
  subTotal: number;
  lineDiscountTotal: number;
  baseTotal: number;
  changeDue: number;
  balanceDue: number;
  onSelectedProductChange: (value: string) => void;
  onAddQtyChange: (value: string) => void;
  onAddToCart: () => void;
  onRemoveFromCart: (productId: string) => void;
  onPaymentModeChange: (value: "PAID" | "PARTIAL" | "UNPAID") => void;
  onPaymentMethodChange: (value: "CASH" | "CARD") => void;
  onPaidAmountChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerContactChange: (value: string) => void;
  onHoldSale: () => void;
  onProcessSale: () => void;
};

export function BillingTab({
  products,
  selectedProductId,
  addQty,
  cart,
  paymentMode,
  paymentMethod,
  paidAmount,
  customerName,
  customerContact,
  subTotal,
  lineDiscountTotal,
  baseTotal,
  changeDue,
  balanceDue,
  onSelectedProductChange,
  onAddQtyChange,
  onAddToCart,
  onRemoveFromCart,
  onPaymentModeChange,
  onPaymentMethodChange,
  onPaidAmountChange,
  onCustomerNameChange,
  onCustomerContactChange,
  onHoldSale,
  onProcessSale,
}: BillingTabProps) {
  return (
    <section className="products-panel">
      <div className="grid-2">
        <div className="panel-card">
          <h3>Add Item</h3>
          <label>
            Product
            <select value={selectedProductId} onChange={(e) => onSelectedProductChange(e.target.value)}>
              {products.map((product) => (
                <option key={product.barcode_id} value={product.barcode_id}>
                  {product.barcode_id} | {product.name} | Rs. {Number(product.sell_price).toFixed(2)} | Stock {Number(product.stock).toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Qty
            <input value={addQty} onChange={(e) => onAddQtyChange(e.target.value)} />
          </label>
          <button type="button" onClick={onAddToCart}>
            Add to Cart
          </button>
        </div>

        <div className="panel-card">
          <h3>Checkout</h3>
          <label>
            Payment Mode
            <select value={paymentMode} onChange={(e) => onPaymentModeChange(e.target.value as "PAID" | "PARTIAL" | "UNPAID")}>
              <option value="PAID">PAID</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="UNPAID">UNPAID</option>
            </select>
          </label>
          <label>
            Payment Method
            <select value={paymentMethod} onChange={(e) => onPaymentMethodChange(e.target.value as "CASH" | "CARD")}>
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
            </select>
          </label>
          <label>
            Paid Amount
            <input
              value={paidAmount}
              onChange={(e) => onPaidAmountChange(e.target.value)}
              placeholder={paymentMode === "PAID" ? "Blank = full amount" : "Required"}
            />
          </label>
          <label>
            Customer Name (credit only)
            <input value={customerName} onChange={(e) => onCustomerNameChange(e.target.value)} />
          </label>
          <label>
            Customer Contact
            <input value={customerContact} onChange={(e) => onCustomerContactChange(e.target.value)} />
          </label>
          <div className="calc-grid">
            <p>Subtotal: Rs. {subTotal.toFixed(2)}</p>
            <p>Line Discount: Rs. {lineDiscountTotal.toFixed(2)}</p>
            <p>Total: Rs. {baseTotal.toFixed(2)}</p>
            <p>Change: Rs. {changeDue.toFixed(2)}</p>
            <p>Balance Due: Rs. {balanceDue.toFixed(2)}</p>
          </div>
          <div className="actions">
            <button type="button" onClick={onHoldSale}>
              Hold Bill
            </button>
            <button type="button" onClick={onProcessSale}>
              Checkout
            </button>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Disc</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item) => (
            <tr key={item.product_id}>
              <td>{item.product_id}</td>
              <td>{item.name}</td>
              <td>{item.qty.toFixed(2)}</td>
              <td>{item.price.toFixed(2)}</td>
              <td>{item.discount.toFixed(2)}</td>
              <td>{(item.qty * Math.max(0, item.price - item.discount)).toFixed(2)}</td>
              <td>
                <button type="button" className="danger" onClick={() => onRemoveFromCart(item.product_id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
