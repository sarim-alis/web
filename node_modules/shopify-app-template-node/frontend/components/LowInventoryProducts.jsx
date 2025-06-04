import { useEffect, useState, useCallback, useMemo } from "react";
import { Layout, Card, DataTable, Button, Pagination, TextField, Modal, Banner, SkeletonBodyText } from "@shopify/polaris";

export function LowInventoryProducts() {
  const [inventoryData, setInventoryData] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [currentPage, setCurrentPage] = useState(1); 
  const [queryValue, setQueryValue] = useState(""); 
  const [inventoryToEdit, setInventoryToEdit] = useState(null); 
  const [newInventoryQuantity, setNewInventoryQuantity] = useState(""); 
  const rowsPerPage = 4; 

  const [activeProduct, setActiveProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newQuantity, setNewQuantity] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setQueryValue(searchTerm);
      setCurrentPage(1);
    }, 300),
    []
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/low-inventory?threshold=10", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then(async (response) => {
        const contentType = response.headers.get("content-type");
        if (!response.ok) {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
          } else {
            const text = await response.text();
            throw new Error(`Server error (${response.status}). Please try again later.`);
          }
        }
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format from server");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched inventory data:", data); // Log the fetched data
        setInventoryData(data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching inventory data:", error);
        setError(error.message);
        setInventoryData([]);
        setLoading(false);
      });
  }, []);

  const handleQueryChange = (value) => {
    setIsSearching(true);
    debouncedSearch(value);
  };

  const filteredData = useMemo(() => {
    const filtered = inventoryData.filter((product) =>
      product.title.toLowerCase().includes(queryValue.toLowerCase())
    );
    setIsSearching(false);
    return filtered;
  }, [inventoryData, queryValue]);

  const rows = filteredData.map((product) => {
    const totalInventory = product.inventory.reduce(
      (sum, variant) => sum + variant.inventoryQuantity,
      0
    );

    return [
      product.title,
      totalInventory,
      <Button onClick={() => handleEditProduct(null, product)}>
        Edit Inventory
      </Button>,
    ];
  });

  const handleEditProduct = (variant, product) => {
    setActiveProduct(product);
    setNewQuantity(product.inventory[0]?.inventoryQuantity?.toString() || "");
    setShowEditModal(true);
  };

  const handleUpdateInventory = async () => {
    if (!activeProduct || !newQuantity) return;

    setIsUpdating(true);
    try {
      console.log("Sending update request:", {
        productId: activeProduct.productId,
        variantId: activeProduct.inventory[0]?.variantId,
        inventoryQuantity: parseInt(newQuantity),
      });

      const response = await fetch("/api/products/update-inventory", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: activeProduct.productId,
          variantId: activeProduct.inventory[0]?.variantId,
          inventoryQuantity: parseInt(newQuantity),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || "Failed to update inventory");
      }

      if (!data.stillLowStock) {
        setInventoryData((prevData) =>
          prevData.filter((product) => product.productId !== activeProduct.productId)
        );
      } else {
        setInventoryData((prevData) =>
          prevData.map((product) =>
            product.productId === activeProduct.productId
              ? {
                  ...product,
                  inventory: product.inventory.map((v) => ({
                    ...v,
                    inventoryQuantity: data.inventoryQuantity,
                  })),
                }
              : product
          )
        );
      }

      setShowEditModal(false);
      setActiveProduct(null);
      setNewQuantity("");
    } catch (error) {
      console.error("Error updating inventory:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsUpdating(false);
    }
  };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageRows = rows.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const editModal = (
    <Modal
      open={showEditModal}
      onClose={() => setShowEditModal(false)}
      title="Edit Inventory"
      primaryAction={{
        content: "Save",
        loading: isUpdating,
        onAction: handleUpdateInventory,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: () => setShowEditModal(false),
        },
      ]}
    >
      <Modal.Section>
        <TextField
          label="Product"
          value={activeProduct?.title || ""}
          disabled
          autoComplete="off"
        />
        <TextField
          label="New Quantity"
          type="number"
          value={newQuantity}
          onChange={setNewQuantity}
          autoComplete="off"
        />
      </Modal.Section>
    </Modal>
  );

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <Card sectioned>
      <SkeletonBodyText lines={3} />
    </Card>
  );

  return (
    <Layout>
      <Layout.Section fullWidth>
        <h4 className="h1-1">Low Inventory Products</h4>
        <Card>
          <Card.Section>
            {error && (
              <Banner status="critical" onDismiss={() => setError(null)}>
                <p>Failed to load inventory data: {error}</p>
              </Banner>
            )}
            
            <TextField
              label="Search products"
              value={queryValue}
              onChange={handleQueryChange}
              clearButton
              onClear={() => setQueryValue("")}
              placeholder="Search by product title"
            />

            {loading ? (
              <LoadingSkeleton />
            ) : isSearching ? (
              <LoadingSkeleton />
            ) : (
              <>
                <DataTable
                  columnContentTypes={["text", "numeric", "text"]}
                  headings={["Title", "Inventory", "Actions"]}
                  rows={currentPageRows}
                />
                <Pagination
                  hasPrevious={currentPage > 1}
                  hasNext={currentPage * rowsPerPage < filteredData.length}
                  onPrevious={() => handlePageChange(currentPage - 1)}
                  onNext={() => handlePageChange(currentPage + 1)}
                  pageCount={Math.ceil(filteredData.length / rowsPerPage)}
                  currentPage={currentPage}
                />
              </>
            )}
          </Card.Section>
        </Card>
      </Layout.Section>
      {editModal}
    </Layout>
  );
}

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}