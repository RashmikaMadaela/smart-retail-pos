import { getDb } from "../backend/db/sqlite";
import { exportSaleBillPdf } from "../backend/services/printService";

async function main() {
  const row = getDb()
    .prepare("SELECT id FROM sales WHERE status = 'COMPLETED' ORDER BY id DESC LIMIT 1")
    .get() as { id: number } | undefined;

  if (!row) {
    console.log("NO_COMPLETED_SALE");
    process.exit(2);
  }

  const result = await exportSaleBillPdf(row.id);
  if (!result.ok) {
    console.log(`ERROR:${result.error || "Unknown error"}`);
    process.exit(1);
  }

  console.log(`SALE_ID:${row.id}`);
  console.log(`BILL_PATH:${result.data.file_path}`);
}

void main();
