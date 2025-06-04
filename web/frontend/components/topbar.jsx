import React, { useEffect, useState } from "react";
import { 
  Icon, 
  Badge, 
  Tooltip, 
  Text, 
  Popover, 
  Card, 
  Banner, 
  Spinner,
  Button,
  Modal,
  TextField
} from "@shopify/polaris";
import { NotificationIcon } from '@shopify/polaris-icons';

export function Topbar() {
  const [lowInventoryProducts, setLowInventoryProducts] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newQuantity, setNewQuantity] = useState("");

  const fetchLowInventoryProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching low inventory products...");
      const response = await fetch("/api/low-inventory?threshold=10");
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Received data:", data);
      
      if (!Array.isArray(data)) {
        console.error("Invalid data format:", data);
        throw new Error("Invalid data format received");
      }

      setLowInventoryProducts(data);
    } catch (err) {
      console.error("Error in fetchLowInventoryProducts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Topbar component mounted");
    fetchLowInventoryProducts();
  }, []);

  const handleUpdateInventory = async () => {
    if (!selectedProduct || !newQuantity) return;

    try {
      const selectedVariant = selectedProduct.inventory[0];
      if (!selectedVariant?.inventoryItemId) {
        throw new Error("No inventory item ID found");
      }

      console.log("Updating inventory for:", {
        product: selectedProduct.title,
        variant: selectedVariant.title,
        quantity: newQuantity,
        inventoryItemId: selectedVariant.inventoryItemId
      });

      // Debug what's actually being sent
      const payload = {
        productId: selectedProduct.productId,
        variantId: selectedVariant.variantId,
        inventoryItemId: selectedVariant.inventoryItemId,
        inventoryQuantity: parseInt(newQuantity)
      };
      console.log("Sending payload:", JSON.stringify(payload));

      const response = await fetch("/api/products/update-inventory", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Update inventory error response:", errorData);
        throw new Error(`Failed to update inventory: ${errorData}`);
      }

      const data = await response.json();
      console.log("Update successful:", data);
      
      await fetchLowInventoryProducts();
      setShowEditModal(false);
      setSelectedProduct(null);
      setNewQuantity("");
    } catch (err) {
      console.error("Update inventory error:", err);
      setError(err.message);
    }
  };

  const notificationToggle = (
    <div style={{ position: "relative", cursor: "pointer" }}>
      <Icon
        source={NotificationIcon}
        tone={loading ? "base" : lowInventoryProducts.length > 0 ? "critical" : "base"}
      />
      {!loading && lowInventoryProducts.length > 0 && (
        <Badge
          status="critical"
          style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
            minWidth: "20px",
            height: "20px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            backgroundColor: "#de3618",
            color: "white",
            border: "2px solid white"
          }}
        >
          {lowInventoryProducts.length}
        </Badge>
      )}
    </div>
  );

  const renderNotificationContent = () => (
    <div style={{ width: "350px", maxHeight: "500px" }}>
      <Card>
        <Card.Header>
          <Text variant="headingMd" as="h2">
            {loading ? "Loading..." : `Low Inventory Alerts (${lowInventoryProducts.length})`}
          </Text>
        </Card.Header>
        <Card.Section>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <Spinner accessibilityLabel="Loading notifications" size="large" />
            </div>
          ) : error ? (
            <Banner status="critical" onDismiss={() => setError(null)}>
              <p>Error: {error}</p>
              <Button onClick={fetchLowInventoryProducts}>Retry</Button>
            </Banner>
          ) : lowInventoryProducts.length === 0 ? (
            <Banner status="success">
              <p>All products have sufficient inventory</p>
            </Banner>
          ) : (
            <div style={{ 
              maxHeight: "400px", 
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "4px"
            }}>
              {lowInventoryProducts.map((product) => (
                <Card key={product.productId}>
                  <Card.Section>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text variant="headingSm" as="h3">
                        {product.title}
                      </Text>
                      <Button 
                        size="slim"
                        onClick={() => {
                          setSelectedProduct(product);
                          setNewQuantity(product.inventory[0]?.inventoryQuantity?.toString() || "");
                          setShowEditModal(true);
                          setIsNotificationOpen(false);
                        }}
                      >
                        Update Stock
                      </Button>
                    </div>
                    {product.inventory.map((variant) => (
                      <div 
                        key={variant.variantId}
                        style={{
                          marginTop: "8px",
                          padding: "8px",
                          backgroundColor: variant.inventoryQuantity === 0 ? '#FFF4F4' : '#FFF9F5',
                          borderRadius: "4px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <Text variant="bodyMd">
                          {variant.title}
                        </Text>
                        <Badge status={variant.inventoryQuantity === 0 ? "critical" : "warning"}>
                          {variant.inventoryQuantity} left
                        </Badge>
                      </div>
                    ))}
                  </Card.Section>
                </Card>
              ))}
            </div>
          )}
        </Card.Section>
      </Card>
    </div>
  );

  return (
    <>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "flex-end",
        padding: "12px"
      }}>
        <Popover
          active={isNotificationOpen}
          activator={
            <Tooltip content="Inventory Notifications">
              <div onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
                {notificationToggle}
              </div>
            </Tooltip>
          }
          onClose={() => setIsNotificationOpen(false)}
          preferredAlignment="right"
        >
          {renderNotificationContent()}
        </Popover>
      </div>

      {/* Update Inventory Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Update Inventory - ${selectedProduct?.title}`}
        primaryAction={{
          content: "Save",
          onAction: handleUpdateInventory
        }}
        secondaryActions={[{
          content: "Cancel",
          onAction: () => setShowEditModal(false)
        }]}
      >
        <Modal.Section>
          <Text variant="bodyMd" as="p" color="subdued">
            Current quantity: {selectedProduct?.inventory[0]?.inventoryQuantity}
          </Text>
          <div style={{ marginTop: "16px" }}>
            <TextField
              label="New Quantity"
              type="number"
              value={newQuantity}
              onChange={setNewQuantity}
              autoComplete="off"
            />
          </div>
        </Modal.Section>
      </Modal>
    </>
  );
}
