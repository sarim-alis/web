import { useEffect, useState, useCallback } from "react";
import { Layout, Card, DataTable, Pagination, TextField } from "@shopify/polaris";

export function FulfillmentTracking() {
  const [orders, setOrders] = useState([]);         // raw fulfillment_orders
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState("");
  const rowsPerPage = 5;

  // 1) fetch fulfillment orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fulfillment_orders", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch fulfillment_orders error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 2) search & filter
  const filtered = orders.filter((o) => {
    const term = query.toLowerCase();
    return (
      String(o.id).includes(term) ||
      String(o.order_id).includes(term) ||
      (o.status || "").toLowerCase().includes(term)
    );
  });

  // 3) paginate
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  // 4) build DataTable rows
  const tableRows = pageRows.map((o) => [
    String(o.id),
    String(o.order_id),
    o.status || "—",
    o.request_status || "—",
    o.supported_actions?.join(", ") || "—",
  ]);

  return (
    <Layout>
      <Layout.Section fullWidth>
        <Card title="Fulfillment Orders">
          <Card.Section>
            <TextField
              label="Search by Fulfillment ID, Order ID or Status"
              value={query}
              onChange={(v) => { setQuery(v); setCurrentPage(1); }}
              clearButton
              onClear={() => setQuery("")}
            />

            {loading ? (
              <p>Loading fulfillment orders…</p>
            ) : (
              <>
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                  ]}
                  headings={[
                    "FulfillmentOrder ID",
                    "Shopify Order ID",
                    "Status",
                    "Request Status",
                    "Actions",
                  ]}
                  rows={tableRows}
                />

                <Pagination
                  hasPrevious={currentPage > 1}
                  hasNext={start + rowsPerPage < filtered.length}
                  onPrevious={() => setCurrentPage((p) => p - 1)}
                  onNext={() => setCurrentPage((p) => p + 1)}
                  pageCount={Math.ceil(filtered.length / rowsPerPage)}
                  currentPage={currentPage}
                />
              </>
            )}
          </Card.Section>
        </Card>
      </Layout.Section>
    </Layout>
  );
}
