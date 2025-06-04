import { Layout, Card, DataTable } from "@shopify/polaris";

export function AmazonProduct() {
  const loading = false; // Simulating no loading
  const products = []; // Simulating no products available

  // Prepare data for the DataTable
  const rows =
    products.length > 0
      ? products.map((product) => [
          product.image || "N/A",
          product.title || "N/A",
          product.sku || "N/A",
          product.description || "N/A",
          `$${product.price || "N/A"}`,
          product.inventory || "N/A",
        ])
      : [["Error: Failed to fetch Amazon products.", "", "", "", "", ""]]; // Error row

  return (
    <Layout>
      <Layout.Section fullWidth>
        <h1 className="h1-1">AMAZON PRODUCTS</h1>
        <Card>
          <Card.Section>
            {loading ? (
              <p>Loading products...</p>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                headings={["Image", "Title", "SKU", "Description", "Price", "Inventory"]}
                rows={rows}
              />
            )}
          </Card.Section>
        </Card>
      </Layout.Section>
    </Layout>
  );
}
