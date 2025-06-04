// src/components/LowInventoryProductsnew.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Page,
  Card,
  TextField,
  Button,
  Spinner,
  Banner,
  DataTable,
  Stack,
  Modal,
  Select,
  ButtonGroup,
} from "@shopify/polaris";

export default function LowInventoryProductsnew() {
  const [threshold, setThreshold] = useState(10);
  const [thresholdInput, setThresholdInput] = useState(threshold.toString());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPageOptions = [
    { label: "4", value: "4" },
    { label: "10", value: "10" },
    { label: "20", value: "20" },
  ];
  const [rowsPerPage, setRowsPerPage] = useState(4);

  // Modal state
  const [activeProduct, setActiveProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newQuantity, setNewQuantity] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch low-inventory whenever `threshold` or `rowsPerPage` changes
  const fetchLowInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/low-inventory?threshold=${threshold}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const { products: data } = await res.json();
      setProducts(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError("Failed to load low-inventory products");
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchLowInventory();
  }, [fetchLowInventory]);

  // Handle threshold input and immediate refetch on valid number
  const handleThresholdChange = (value) => {
    setThresholdInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setThreshold(num);
    }
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (value) => {
    const num = parseInt(value, 10);
    setRowsPerPage(num);
    setCurrentPage(1);
  };

  // Open edit modal
  const handleEditClick = (product) => {
    const lowest = product.variants.reduce(
      (min, v) =>
        typeof v.inventory_quantity === "number" && v.inventory_quantity < min
          ? v.inventory_quantity
          : min,
      Infinity
    );
    setActiveProduct(product);
    setNewQuantity(isFinite(lowest) ? lowest.toString() : "");
    setShowEditModal(true);
  };

  // Update handleUpdateInventory function
  const handleUpdateInventory = async () => {
    if (!activeProduct) return;
    setIsUpdating(true);
    try {
      const variant = activeProduct.variants[0];
      const res = await fetch("/api/products/update-inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: activeProduct.id,
          variantId: variant.id,
          inventoryItemId: variant.inventory_item_id,
          inventoryQuantity: parseInt(newQuantity),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      // Update local state immediately without refetching
      setProducts(prevProducts => 
        prevProducts.map(product => {
          if (product.id === activeProduct.id) {
            return {
              ...product,
              variants: product.variants.map(v => 
                v.id === variant.id 
                  ? { ...v, inventory_quantity: parseInt(newQuantity) }
                  : v
              )
            };
          }
          return product;
        }).filter(product => 
          product.variants.some(v => 
            typeof v.inventory_quantity === "number" && 
            v.inventory_quantity < threshold
          )
        )
      );

      setShowEditModal(false);
      setActiveProduct(null);
      setNewQuantity("");

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Paginated slice
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return products.slice(start, start + rowsPerPage);
  }, [products, currentPage, rowsPerPage]);

  // Build DataTable rows with conditional styling for low inventory
  const rows = paginated.map((product) => {
    const lowestQty = product.variants.reduce(
      (min, v) =>
        typeof v.inventory_quantity === "number" && v.inventory_quantity < min
          ? v.inventory_quantity
          : min,
      Infinity
    );
    const isCritical = lowestQty < 10;

    const qtyCell = isCritical ? (
      <div
        style={{
          backgroundColor: "rgba(255,0,0,0.1)",
          borderRadius: "4px",
          padding: "2px 8px",
          display: "inline-block",
        }}
      >
        {lowestQty}
      </div>
    ) : (
      lowestQty
    );

    return [
      product.title,
      qtyCell,
      <Button outline size="slim" onClick={() => handleEditClick(product)}>
        Edit
      </Button>,
    ];
  });

  const pageCount = Math.ceil(products.length / rowsPerPage);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pageCount, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  // Replace the old pagination JSX with this new one
  const TableFooter = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '16px',
      borderTop: '1px solid #dfe3e8'
    }}>
      <p>
        Showing {Math.min((currentPage - 1) * rowsPerPage + 1, products.length)} - 
        {Math.min(currentPage * rowsPerPage, products.length)} of {products.length} products
      </p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <ButtonGroup>
          <Button
            plain
            icon={<span>{'<<'}</span>}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            accessibilityLabel="First page"
          />
          <Button
            plain
            icon={<span>{'<'}</span>}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            accessibilityLabel="Previous page"
          />
          {getPageNumbers().map(pageNum => (
            <Button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              primary={currentPage === pageNum}
              plain={currentPage !== pageNum}
              size="slim"
            >
              {pageNum}
            </Button>
          ))}
          <Button
            plain
            icon={<span>{'>'}</span>}
            disabled={currentPage === pageCount}
            onClick={() => setCurrentPage(currentPage + 1)}
            accessibilityLabel="Next page"
          />
          <Button
            plain
            icon={<span>{'>>'}</span>}
            disabled={currentPage === pageCount}
            onClick={() => setCurrentPage(pageCount)}
            accessibilityLabel="Last page"
          />
        </ButtonGroup>
      </div>
    </div>
  );

  return (
    <Page title="Low Inventory Products">
      <Card sectioned>
        <Stack alignment="center" spacing="tight">
          <Stack.Item fill>
            <TextField
              label="Threshold"
              type="number"
              value={thresholdInput}
              onChange={handleThresholdChange}
              suffix="units"
              connectedRight={
                <Button primary onClick={fetchLowInventory} loading={loading}>
                  Refresh
                </Button>
              }
            />
          </Stack.Item>

          <Select
            label="Rows per page"
            options={rowsPerPageOptions}
            onChange={handleRowsPerPageChange}
            value={rowsPerPage.toString()}
            labelHidden
            style={{ textAlign: 'center' }}
          />
        </Stack>
      </Card>

      {error && (
        <Banner status="critical" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      <Card sectioned>
        {loading ? (
          <Spinner size="large" accessibilityLabel="Loading products" />
        ) : products.length === 0 ? (
          <Banner title="No low-inventory products found" status="info" />
        ) : (
          <>
            <DataTable
              columnContentTypes={["text", "text", "text"]}
              headings={["Title", "Lowest Inventory", "Action"]}
              rows={rows}
              verticalAlign="middle"
            />
            <TableFooter />
          </>
        )}
      </Card>

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Inventory"
        primaryAction={{
          content: "Save",
          onAction: handleUpdateInventory,
          loading: isUpdating,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setShowEditModal(false) },
        ]}
      >
        <Modal.Section>
          <TextField
            label="Product"
            value={activeProduct?.title || ""}
            disabled
          />
          <TextField
            label="New Quantity"
            type="number"
            value={newQuantity}
            onChange={setNewQuantity}
          />
        </Modal.Section>
      </Modal>
    </Page>
  );
}
