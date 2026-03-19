import { FormEvent, useMemo, useState } from "react";
import { useSessionStore } from "./store/useSessionStore";

type Product = {
  barcode_id: string;
  name: string;
  sell_price: number;
  stock: number;
};

type Summary = {
  gross_sales: number;
  cogs: number;
  expenses: number;
  net_profit: number;
};

export default function App() {
  const { user, setUser } = useSessionStore();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [searchText, setSearchText] = useState("");

  const netColor = useMemo(() => {
    if (!summary) {
      return "#f5f7fa";
    }
    return summary.net_profit >= 0 ? "#0ea95f" : "#d43636";
  }, [summary]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");

    const response = await window.posApi.login(username, password);
    if (!response.ok) {
      setError(response.error ?? "Login failed.");
      return;
    }

    setUser(response.data);
    await refreshProducts();
    await refreshSummary();
  }

  async function refreshProducts() {
    const response = searchText.trim()
      ? await window.posApi.searchProducts(searchText.trim(), 50)
      : await window.posApi.listProducts(50);
    if (response.ok) {
      setProducts(response.data);
    }
  }

  async function refreshSummary() {
    const response = await window.posApi.getSummary();
    if (response.ok) {
      setSummary(response.data);
    }
  }

  if (!user) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <h1>Smart Retail POS Next</h1>
          <p className="muted">Electron + React migration shell</p>
          <form onSubmit={handleLogin}>
            <label>
              Username
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit">Login</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header>
        <div>
          <h1>Smart Retail POS Next</h1>
          <p>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </p>
        </div>
        <button
          onClick={() => {
            setUser(null);
            setProducts([]);
            setSummary(null);
          }}
        >
          Logout
        </button>
      </header>

      <section className="summary-grid">
        <article>
          <h3>Gross Sales</h3>
          <p>Rs. {summary ? summary.gross_sales.toFixed(2) : "0.00"}</p>
        </article>
        <article>
          <h3>COGS</h3>
          <p>Rs. {summary ? summary.cogs.toFixed(2) : "0.00"}</p>
        </article>
        <article>
          <h3>Expenses</h3>
          <p>Rs. {summary ? summary.expenses.toFixed(2) : "0.00"}</p>
        </article>
        <article>
          <h3>Net Profit</h3>
          <p style={{ color: netColor }}>Rs. {summary ? summary.net_profit.toFixed(2) : "0.00"}</p>
        </article>
      </section>

      <section className="products-panel">
        <div className="panel-head">
          <h2>Product Read Check</h2>
          <div className="actions">
            <input
              placeholder="Search products"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button onClick={() => void refreshProducts()}>Refresh</button>
            <button onClick={() => void refreshSummary()}>Refresh KPI</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Sell Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.barcode_id}>
                <td>{product.barcode_id}</td>
                <td>{product.name}</td>
                <td>{Number(product.sell_price).toFixed(2)}</td>
                <td>{Number(product.stock).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
