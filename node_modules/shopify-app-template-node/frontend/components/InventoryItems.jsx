import { useEffect, useState } from "react";
import { Layout, Card, DataTable, Button, Pagination, TextField, Modal } from "@shopify/polaris";

export function InventoryItems() {
  const [inventoryItems, setInventoryItems] = useState([]); // State to store inventory items
  const [loading, setLoading] = useState(true); // Loading state
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const [queryValue, setQueryValue] = useState(""); // State for the search query
  const [inventoryToEdit, setInventoryToEdit] = useState(null); // Track which inventory item is being edited
  const [newInventoryData, setNewInventoryData] = useState({ sku: "", tracked: false, cost: "" }); // New inventory data
  const rowsPerPage = 4; // Rows per page for pagination

  // Fetch inventory items on component mount
  useEffect(() => {
    fetch("/api/inventory-items", {
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
        console.log("Fetched inventory items:", data); // Check the fetched data
        setInventoryItems(data || []); // Store the fetched inventory items
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching inventory items:", error);
        setLoading(false);
      });
  }, []);

  // Handle search query change
  const handleQueryChange = (value) => {
    setQueryValue(value);
    setCurrentPage(1); // Reset to first page on new search
  };
  console.log("Filtered Inventory Items:", inventoryItems); 
  // Filter inventory items based on search query  console.log("Filtered Inventory Items:", inventoryItems); 

  const filteredItems = inventoryItems.filter((item) => {
    const skuMatches = item.sku && item.sku.toLowerCase().includes(queryValue.toLowerCase());
    const idMatches = item.id.toString().includes(queryValue);
    console.log("Item SKU:", item.sku, "Query:", queryValue, "SKU Matches:", skuMatches, "ID Matches:", idMatches);
    return skuMatches || idMatches || queryValue === ""; // Include all items if query is empty
  });

  console.log("Filtered Inventory Items:", filteredItems); // Log the filtered items

  // Prepare data for the DataTable
  const rows = filteredItems.map((item) => [
    item.id,
    item.sku || "N/A", // Handle empty SKU
    item.tracked ? "Yes" : "No",
    item.cost !== null ? item.cost : "N/A", // Handle null cost
    <Button key={item.id} onClick={() => setInventoryToEdit(item)}>
      Edit
    </Button>,
  ]);

  console.log("Rows for DataTable:", rows); // Log the rows for DataTable

  // Handle updating inventory items
  const handleUpdateInventoryItem = (id) => {
    fetch(`/api/inventory-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: newInventoryData.sku,
        tracked: newInventoryData.tracked,
        cost: newInventoryData.cost,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update inventory item");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Inventory item updated:", data);
        // Update the inventoryItems state
        setInventoryItems((prevItems) =>
          prevItems.map((item) =>
            item.id === id ? { ...item, ...newInventoryData } : item
          )
        );
        setInventoryToEdit(null); // Close the modal
        setNewInventoryData({ sku: "", tracked: false, cost: "" }); // Clear the form
      })
      .catch((error) => {
        console.error("Error updating inventory item:", error);
      });
  };

  // Pagination handling
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageRows = rows.slice(startIndex, endIndex);

  console.log("Current Page Rows:", currentPageRows); // Log the current page rows

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <Layout>
      <Layout.Section fullWidth>
        <h4 className="h1-1">Inventory Items</h4>
        <Card>
          <Card.Section>
            {/* Search Bar */}
            <TextField
              label="Search inventory items"
              value={queryValue}
              onChange={handleQueryChange}
              clearButton
              onClear={() => setQueryValue("")}
              placeholder="Search by SKU or ID"
            />

            {loading ? (
              <p>Loading inventory...</p>
            ) : (
              <>
                {/* Inventory Items Table */}
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={["ID", "SKU", "Tracked", "Cost", "Actions"]}
                  rows={currentPageRows}
                />

                {/* Pagination component */}
                <Pagination
                  hasPrevious={currentPage > 1}
                  hasNext={currentPage * rowsPerPage < filteredItems.length}
                  onPrevious={() => handlePageChange(currentPage - 1)}
                  onNext={() => handlePageChange(currentPage + 1)}
                  pageCount={Math.ceil(filteredItems.length / rowsPerPage)}
                  currentPage={currentPage}
                />
              </>
            )}
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* Modal for editing inventory items */}
      <Modal
        open={inventoryToEdit !== null}
        onClose={() => setInventoryToEdit(null)}
        title="Edit Inventory Item"
        primaryAction={{
          content: "Save",
          onAction: () => handleUpdateInventoryItem(inventoryToEdit.id),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setInventoryToEdit(null),
          },
        ]}
      >
        <Modal.Section>
          <TextField
            label="SKU"
            value={newInventoryData.sku}
            onChange={(value) => setNewInventoryData({ ...newInventoryData, sku: value })}
            placeholder="Enter SKU"
          />
          <TextField
            label="Cost"
            value={newInventoryData.cost}
            onChange={(value) => setNewInventoryData({ ...newInventoryData, cost: value })}
            placeholder="Enter cost"
          />
          <Button
            onClick={() => setNewInventoryData({ ...newInventoryData, tracked: !newInventoryData.tracked })}
          >
            {newInventoryData.tracked ? "Tracked" : "Not Tracked"}
          </Button>
        </Modal.Section>
      </Modal>
    </Layout>
  );
}