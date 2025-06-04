import { useEffect, useState } from "react";
import { Layout, Card, DataTable, Button, Pagination, TextField } from "@shopify/polaris";

export function Indecxtable() {
  const [products, setProducts] = useState([]); 
  const [loading, setLoading] = useState(true);  
  const [currentPage, setCurrentPage] = useState(1); // Track the current page
  const [queryValue, setQueryValue] = useState(""); // State for the search query
  const rowsPerPage = 4; // Number of rows per page

  useEffect(() => {
    fetch("/api/products/all", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("There was an error fetching products!", error);
        setLoading(false);
      });
  }, []);

  // Handle the search query change
  const handleQueryChange = (value) => {
    setQueryValue(value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Filter the products based on the search query
  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(queryValue.toLowerCase())
  );

  // Prepare data for the DataTable (filtered products)
  const rows = filteredProducts.map((product) => {
    const variant = product.variants[0]; // Assuming we're showing the first variant's details
    const sku = variant.sku;
    const price = variant.price;
    const inventory = variant.inventory_quantity;
    const imageUrl = product.images.length > 0 ? product.images[0].src : ""; // Get first image

    return [
      <img
        src={imageUrl}
        alt={product.title}
        style={{ width: "50px", height: "50px" }}
      />,
      product.title,
      sku,
      <div dangerouslySetInnerHTML={{ __html: product.body_html }} />,
      `$${price}`, // Price
      inventory, // Inventory
      <Button onClick={() => handleEditProduct(product)}>Edit</Button>, // Edit Button
    ];
  });

  const handleEditProduct = (product) => {
    // Add your logic to handle product editing (e.g., opening a modal or redirecting to edit page)
    console.log("Edit Product:", product);
  };

  // Calculate the index range for the current page
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageRows = rows.slice(startIndex, endIndex);

  // Pagination change handler
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <Layout>
      <Layout.Section fullWidth>
        <h4 className="h1-1">Inventory Tracking Table</h4>

        <Card>
          <Card.Section>
            {/* Search Bar */}
            <TextField
              label="Search products"
              value={queryValue}
              onChange={handleQueryChange}
              clearButton
              onClear={() => setQueryValue("")}
              placeholder="Search by product title"
            />

            {loading ? (
              <p>Loading products...</p>
            ) : (
              <>
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                  ]}
                  headings={["Image", "Title", "SKU", "Description", "Price", "Inventory", "Actions"]}
                  rows={currentPageRows}
                />

                {/* Pagination component */}
                <Pagination
                  hasPrevious={currentPage > 1}
                  hasNext={currentPage * rowsPerPage < filteredProducts.length}
                  onPrevious={() => handlePageChange(currentPage - 1)}
                  onNext={() => handlePageChange(currentPage + 1)}
                  pageCount={Math.ceil(filteredProducts.length / rowsPerPage)} // Total pages
                  currentPage={currentPage} // Current page number
                />
              </>
            )}
          </Card.Section>
        </Card>
      </Layout.Section>
    </Layout>
  );
}  