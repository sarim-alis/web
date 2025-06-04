import { useEffect, useState } from "react";
import { Page, Layout, Card, DataTable, Button } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { SyncGraph } from "./DailySyncGraph";
export function DailySyncLogTable() {
  const [products, setProducts] = useState([]); 
  const [loading, setLoading] = useState(true);  

  useEffect(() => {
    fetch("/api/products/all", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
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

  // Prepare data for the DataTable
  const rows = products.map(product => {
    const variant = product.variants[0];  // Assuming we're showing the first variant's details
    const sku = variant.sku;
    const price = variant.price;
    const inventory = variant.inventory_quantity;
    const imageUrl = product.images.length > 0 ? product.images[0].src : ""; // Get first image

    return [
     
      
      inventory,   
      <h4 onClick={() => handleEditProduct(product)}>0</h4> ,
      <h4 >0</h4> ,
     
      
    ];
  });

  const handleEditProduct = (product) => {
    // Add your logic to handle product editing (e.g., opening a modal or redirecting to edit page)
    console.log("Edit Product:", product);
  };

  return (
      <Layout className="d-flexx">
      
        <Layout.Section>
        <div className="syncgraph"><SyncGraph /></div>
        </Layout.Section>
      </Layout>
  );
}

