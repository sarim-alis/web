// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import fetch from "node-fetch";
import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import axios from 'axios'; 
const router = express.Router();

console.log(process.env.SHOPIFY_API_KEY);
const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

app.use("/api/*", shopify.validateAuthenticatedSession());
app.use(express.json());




app.get("/api/products/inventory", async (req, res) => {
  try {
    if (!res.locals.shopify.session) {
      return res.status(400).json({ error: "No valid Shopify session found." });
    }

    const accessToken = res.locals.shopify.session.accessToken;
    const shop = res.locals.shopify.session.shop;
    const apiVersion = "2024-10"; 

    const url = `https://${shop}/admin/api/${apiVersion}/products.json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const data = await response.json();
    const products = data.products;

    const inventoryData = await Promise.all(
      products.map(async (product) => {
        const variantInventory = await Promise.all(
          product.variants.map(async (variant) => {
            const inventoryUrl = `https://${shop}/admin/api/${apiVersion}/inventory_items/${variant.inventory_item_id}.json`;
            const inventoryResponse = await fetch(inventoryUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
              },
            });

            if (!inventoryResponse.ok) {
              throw new Error(`Failed to fetch inventory data for variant: ${variant.id}`);
            }

            const inventoryData = await inventoryResponse.json();
            return {
              variantId: variant.id,
              title: variant.title,
              inventoryQuantity: inventoryData.inventory_item.inventory_quantity,
            };
          })
        );

        return {
          productId: product.id,
          title: product.title,
          inventory: variantInventory,
        };
      })
    );

    res.status(200).json(inventoryData);
  } catch (error) {
    console.error("Error fetching inventory data:", error);
    res.status(500).json({ error: "Failed to fetch inventory data", details: error.message });
  }
});

app.get("/api/inventory-items", async (req, res) => {
  try {
    if (!res.locals.shopify.session) {
      return res.status(400).json({ error: "No valid Shopify session found." });
    }

    const accessToken = res.locals.shopify.session.accessToken;
    const shop = res.locals.shopify.session.shop;
    const apiVersion = "2024-10";

    // Step 1: Fetch all products and their variants
    const productsUrl = `https://${shop}/admin/api/${apiVersion}/products.json`;
    const productsResponse = await fetch(productsUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });

    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch products: ${productsResponse.statusText}`);
    }

    const productsData = await productsResponse.json();
    const products = productsData.products;

    // Step 2: Extract inventory_item_ids from variants
    const inventoryItemIds = products.flatMap((product) =>
      product.variants.map((variant) => variant.inventory_item_id)
    );

    // Step 3: Fetch inventory items using the extracted IDs
    const inventoryItemsUrl = `https://${shop}/admin/api/${apiVersion}/inventory_items.json?ids=${inventoryItemIds.join(",")}`;
    const inventoryItemsResponse = await fetch(inventoryItemsUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });

    if (!inventoryItemsResponse.ok) {
      throw new Error(`Failed to fetch inventory items: ${inventoryItemsResponse.statusText}`);
    }

    const inventoryItemsData = await inventoryItemsResponse.json();
    res.status(200).json(inventoryItemsData.inventory_items);
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/products/update-inventory", async (req, res) => {
  try {
    const { productId, variantId, inventoryQuantity, inventoryItemId } = req.body;
    
    // Debug what's being received
    console.log("Received update request with body:", JSON.stringify(req.body));
    
    if (!inventoryItemId) {
      return res.status(400).json({ error: "Inventory item ID is required" });
    }

    if (typeof inventoryQuantity !== 'number' && typeof parseInt(inventoryQuantity) !== 'number') {
      return res.status(400).json({ error: "Invalid inventory quantity" });
    }

    const session = res.locals.shopify.session;
    if (!session) {
      return res.status(401).json({ error: "No valid session" });
    }

    const { accessToken, shop } = session;
    const apiVersion = "2024-01"; // Same as the low-inventory endpoint

    console.log("Updating inventory with:", {
      shop,
      inventoryItemId,
      inventoryQuantity
    });

    // 1. Get the location ID first
    const locationResponse = await fetch(
      `https://${shop}/admin/api/${apiVersion}/locations.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    if (!locationResponse.ok) {
      throw new Error(`Failed to fetch locations: ${await locationResponse.text()}`);
    }

    const { locations } = await locationResponse.json();
    const locationId = locations[0]?.id;

    if (!locationId) {
      throw new Error("No valid location found");
    }

    // 2. Update the inventory level
    const updateUrl = `https://${shop}/admin/api/${apiVersion}/inventory_levels/set.json`;
    
    const updatePayload = {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available: parseInt(inventoryQuantity)
    };
    
    console.log("Sending update payload:", JSON.stringify(updatePayload));
    
    const updateResponse = await fetch(updateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify(updatePayload),
    });

    console.log("Update response status:", updateResponse.status);

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error("Shopify error response:", errorText);
      throw new Error(`Failed to update inventory: ${errorText}`);
    }

    const updatedData = await updateResponse.json();
    console.log("Update successful with data:", JSON.stringify(updatedData));
    res.status(200).json(updatedData);
  } catch (error) {
    console.error("Error in update-inventory:", error);
    res.status(500).json({
      error: "Failed to update inventory",
      details: error.message
    });
  }
});

// Helper function to get location ID
async function getLocationId(shop, accessToken, apiVersion) {
  const locResponse = await fetch(
    `https://${shop}/admin/api/${apiVersion}/locations.json`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    }
  );
  
  if (!locResponse.ok) {
    throw new Error("Failed to fetch locations");
  }
  
  const { locations } = await locResponse.json();
  return locations[0]?.id;
}

app.put("/api/inventory-items/:id", async (req, res) => {
  const { id } = req.params;
  const { sku, tracked, cost } = req.body;
  
  try {
    if (!res.locals.shopify.session) {
      return res.status(400).json({ error: "No valid Shopify session found." });
    }
  
    const accessToken = res.locals.shopify.session.accessToken;
    const shop = res.locals.shopify.session.shop;
    const apiVersion = "2024-10";
  
    // Update inventory item
    const url = `https://${shop}/admin/api/${apiVersion}/inventory_items/${id}.json`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        inventory_item: {
          sku,
          tracked,
          cost,
        },
      }),
    });
  
    if (!response.ok) {
      throw new Error("Failed to update inventory item");
    }
  
    const data = await response.json();
    res.status(200).json(data.inventory_item);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/fulfillment-details", async (req, res) => {
  try {
    if (!res.locals.shopify.session) {
      return res.status(400).json({ error: "No valid Shopify session found." });
    }
  
    const accessToken = res.locals.shopify.session.accessToken;
    const shop = res.locals.shopify.session.shop;
    const apiVersion = "2024-10"; // Shopify API version
  
    // Step 1: Fetch orders
    const ordersUrl = `https://${shop}/admin/api/${apiVersion}/orders.json?status=any`;
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
  
    if (!ordersResponse.ok) {
      throw new Error("Failed to fetch orders");
    }
  
    const ordersData = await ordersResponse.json();
    const orders = ordersData.orders;
  
    // Step 2: Extract fulfillment IDs from orders
    const fulfillmentOrderIds = orders.flatMap(order => order.fulfillments.map(fulfillment => fulfillment.id));
  
    if (!fulfillmentOrderIds.length) {
      return res.status(400).json({ error: "No fulfillments found for the orders" });
    }
  
    // Step 3: Fetch fulfillment details using the fulfillmentOrderIds
    const fulfillments = [];
  
    for (let id of fulfillmentOrderIds) {
      const fulfillmentUrl = `https://${shop}/admin/api/2024-10/fulfillment_orders/${id}/fulfillments.json`;
      const fulfillmentResponse = await fetch(fulfillmentUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      });
  
      if (!fulfillmentResponse.ok) {
        throw new Error(`Failed to fetch fulfillment details for fulfillment order ID: ${id}`);
      }
  
      const fulfillmentData = await fulfillmentResponse.json();
      fulfillments.push(...fulfillmentData.fulfillments);
    }
  
    // Step 4: Return the fulfillment details
    res.status(200).json({ fulfillments });
  
  } catch (error) {
    console.error("Error fetching fulfillment details:", error);
    res.status(500).json({ error: error.message });
  }
});
  
  
  
app.get("/api/products/all", async (_req, res) => {
  try {
    // Step 1: Validate the session is available and authenticated
    if (!res.locals.shopify.session) {
      return res.status(400).json({ error: "No valid Shopify session found." });
    }

    // Step 2: Fetch products from Shopify API (using REST API)
    const accessToken = res.locals.shopify.session.accessToken;
    const shop = res.locals.shopify.session.shop;
    const apiVersion = "2024-10"; // Make sure this matches the API version you're using
    
    // Construct the Shopify REST API URL for fetching products
    const url = `https://${shop}/admin/api/${apiVersion}/products.json`;

    // Fetch the products from Shopify REST Admin API
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });

    // Check if the response was successful
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    // Parse the JSON response
    const data = await response.json();

    // Step 3: Return the products data
    res.status(200).json(data.products); // Send the list of products to the frontend
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: 'Failed to fetch products from Shopify' });
  }
});






app.get("/api/orders/all", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session) {
      return res.status(400).json({ error: "No valid Shopify session found." });
    }

    const { accessToken, shop } = session;
    const apiVersion = "2024-10";
    const productId = req.query.product_id;

    let url = `https://${shop}/admin/api/${apiVersion}/orders.json?status=any&limit=250`;
    if (productId) {
      url += `&product_id=${productId}`;
    }

    const ordersRes = await fetch(url, {
      headers: { 
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json"
      }
    });

    if (!ordersRes.ok) {
      throw new Error("Failed to fetch orders");
    }

    const { orders } = await ordersRes.json();

    const filteredOrders = productId
      ? orders.filter(order => 
          order.line_items.some(item => item.product_id.toString() === productId)
        )
      : orders;

    return res.status(200).json(filteredOrders);
  } catch (err) {
    console.error("Error in /api/orders/all:", err);
    return res.status(500).json({ error: err.message });
  }
});


// app.get("/api/orders/all", async (req, res) => {
//   try {
//     const { session } = res.locals.shopify;
//     if (!session) return res.status(400).json({ error: "No valid session" });

//     const { accessToken, shop } = session;
//     const apiVersion = "2024-10";
//     const productId    = req.query.product_id;

//     let baseURL = `https://${shop}/admin/api/${apiVersion}/orders.json?status=any&limit=250`;
//     if (productId) baseURL += `&product_id=${productId}`;

//     let allOrders   = [];
//     let pageInfo    = null;

//     do {
//       const url = pageInfo ? `${baseURL}&page_info=${pageInfo}` : baseURL;

//       const resp = await fetch(url, {
//         headers: {
//           "X-Shopify-Access-Token": accessToken,
//           "Content-Type": "application/json",
//         },
//       });
//       if (!resp.ok) throw new Error(`Shopify responded ${resp.status}`);

//       const { orders = [] } = await resp.json();
//       allOrders = allOrders.concat(orders);

//       const link = resp.headers.get("link") || "";
//       const match = link.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
//       pageInfo = match ? match[1] : null;

//       if (pageInfo) await new Promise(r => setTimeout(r, 300));
//     } while (pageInfo);

//     const result = productId
//       ? allOrders.filter(o =>
//           o.line_items.some(li => String(li.product_id) === String(productId))
//         )
//       : allOrders;

//     return res.json(result);
//   } catch (err) {
//     console.error("Error in /api/orders/all:", err);
//     res.status(500).json({ error: err.message });
//   }
// });










app.get("/api/orders/:id", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session) return res.status(401).json({ error: "No valid Shopify session" });

    const { id } = req.params;
    const apiVersion = "2024-10";
    const url = `https://${session.shop}/admin/api/${apiVersion}/orders/${id}.json?fields=id,name,tracking_number,fulfillment_status`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": session.accessToken,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("Shopify Error:", body);
      return res.status(response.status).json({ error: body });
    }

    const { order } = await response.json();  // Shopify returns { order: { ... } }
    res.json(order);
  } catch (err) {
    console.error("Error in GET /api/orders/:id", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/products/inventory", async (req, res) => {
  try {
    const { accessToken, shop } = res.locals.shopify.session;
    const apiVersion = "2024-10";
    const url = `https://${shop}/admin/api/${apiVersion}/products.json`;

    // 1. Fetch all products
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    const { products } = await response.json();

    // 2. Map to include inventory quantities
    const inventoryData = await Promise.all(
      products.map(async (product) => {
        const variantInventory = await Promise.all(
          product.variants.map(async (variant) => {
            const invRes = await fetch(
              `https://${shop}/admin/api/${apiVersion}/inventory_items/${variant.inventory_item_id}.json`,
              { headers: { "X-Shopify-Access-Token": accessToken } }
            );
            const { inventory_item } = await invRes.json();
            return {
              variantId: variant.id,
              title: variant.title,
              inventoryQuantity: inventory_item.inventory_quantity,
            };
          })
        );
        return {
          productId: product.id,
          title: product.title,
          inventory: variantInventory,
        };
      })
    );

    // 3. Filter down to only products with at least one variant < 10 units
    const lowStockProducts = inventoryData.filter((product) =>
      product.inventory.some((v) => v.inventoryQuantity < 10)
    );

    // 4. Return only those “low stock” products
    res.status(200).json(lowStockProducts);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to fetch inventory data", details: error.message });
  }
});


app.post("/api/orders/update", async (req, res) => {
  const { orderId, customerEmail, shippingAddress, trackingNumber } = req.body;

  try {
    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const accessToken = res.locals.shopify.session.accessToken;
    const shop = res.locals.shopify.session.shop;
    const apiVersion = "2024-10";

    const url = `https://${shop}/admin/api/${apiVersion}/orders/${orderId}.json`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        order: {
          id: orderId,
          customer: { email: customerEmail },
          shipping_address: { address1: shippingAddress },
          tracking_number: trackingNumber,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Error updating order:", errorBody);
      return res.status(response.status).json({ error: `Failed to update order: ${errorBody}` });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order", details: error.message });
  }
});


// routes/fulfillmentOrders.js

app.get("/api/fulfillment_orders", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session) return res.status(401).json({ error: "No valid Shopify session found." });

    const { accessToken, shop } = session;
    const apiVersion = "2024-01"; // Changed from 2025-04 to 2024-01

    // First get orders to get fulfillment orders
    const ordersUrl = `https://${shop}/admin/api/${apiVersion}/orders.json?status=any`;
    const ordersResponse = await fetch(ordersUrl, {
      headers: { "X-Shopify-Access-Token": accessToken }
    });

    if (!ordersResponse.ok) {
      throw new Error("Failed to fetch orders");
    }

    const { orders } = await ordersResponse.json();

    // Get fulfillment orders for each order
    const fulfillmentOrders = [];
    for (const order of orders) {
      const fulfillmentUrl = `https://${shop}/admin/api/${apiVersion}/orders/${order.id}/fulfillment_orders.json`;
      const fulfillmentResponse = await fetch(fulfillmentUrl, {
        headers: { "X-Shopify-Access-Token": accessToken }
      });

      if (fulfillmentResponse.ok) {
        const { fulfillment_orders } = await fulfillmentResponse.json();
        fulfillmentOrders.push(...fulfillment_orders);
      }
    }

    res.status(200).json({ fulfillment_orders: fulfillmentOrders });
  } catch (err) {
    console.error("Error fetching fulfillment orders:", err);
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/low-inventory", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session) return res.status(400).json({ error: "No session" });
    const { accessToken, shop } = session;
    const apiVersion = "2024-01";
    const threshold = Number(req.query.threshold) || 10;

    // 1) Fetch all products paginated
    let products = [];
    let nextPageInfo = null;
    do {
      const url = new URL(`https://${shop}/admin/api/${apiVersion}/products.json`);
      url.searchParams.set("limit", "250");
      if (nextPageInfo) url.searchParams.set("page_info", nextPageInfo);

      const resp = await fetch(url.toString(), {
        headers: { "X-Shopify-Access-Token": accessToken }
      });
      if (!resp.ok) throw new Error("Products fetch failed");

      const json = await resp.json();
      products = products.concat(json.products);
      // extract Link header cursor for nextPageInfo
      const link = resp.headers.get("link") || "";
      const match = link.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
      nextPageInfo = match ? match[1] : null;
    } while (nextPageInfo);

    // 2) Collect all low-stock variants via chunked bulk calls
    const lowProducts = [];
    for (const product of products) {
      // gather all inventory_item_ids
      const ids = product.variants.map(v => v.inventory_item_id);
      // chunk ids into groups of 50
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50).join(",");
        const invResp = await fetch(
          `https://${shop}/admin/api/${apiVersion}/inventory_levels.json?inventory_item_ids=${chunk}`,
          { headers: { "X-Shopify-Access-Token": accessToken } }
        );
        if (!invResp.ok) continue;
        const { inventory_levels } = await invResp.json();

        // filter low stock in this chunk
        const lowVariants = inventory_levels
          .filter(l => l.available < threshold)
          .map(l => {
            const variant = product.variants.find(v => v.inventory_item_id === l.inventory_item_id);
            return variant
              ? {
                  variantId: variant.id,
                  inventoryItemId: variant.inventory_item_id, // Add this line
                  title: variant.title,
                  inventoryQuantity: l.available
                }
              : null;
          })
          .filter(x => x);

        if (lowVariants.length) {
          lowProducts.push({
            productId: product.id,
            title: product.title,
            inventory: lowVariants
          });
        }
      }
    }

    return res.json(lowProducts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});



app.get("/api/products/low-inventory", async (req, res) => {
  try {
    // 1. Ensure Shopify session exists
    if (!res.locals.shopify.session) {
      return res.status(400).json({ error: "No valid Shopify session found." });
    }

    // 2. Parse threshold from query (e.g. ?threshold=20)
    const threshold = Number(req.query.threshold) || 10;

    const { accessToken, shop } = res.locals.shopify.session;
    const apiVersion = "2024-10";
    // you can increase limit up to 250; for >250 prods you’ll need to paginate
    const url = `https://${shop}/admin/api/${apiVersion}/products.json?limit=250`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const { products } = await response.json();

    // 3. Filter products where any variant is below the threshold
    const lowInventory = products.filter(product =>
      product.variants.some(variant =>
        typeof variant.inventory_quantity === "number" &&
        variant.inventory_quantity < threshold
      )
    );

    // 4. Return the filtered list
    res.status(200).json({ threshold, count: lowInventory.length, products: lowInventory });
  } catch (error) {
    console.error("Error fetching low-inventory products:", error);
    res.status(500).json({ error: "Failed to fetch low-inventory products" });
  }
});

app.get("/api/orders/all", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { page = 1, limit = 100, status, date_filter, search } = req.query;
    let url = `https://${session.shop}/admin/api/2024-10/orders.json?status=any&limit=250`;

    // Add status filter if specified (but not 'all')
    if (status && status !== 'all') {
      url += `&financial_status=${status}`;
    }

    // Add date range filter if specified
    if (date_filter && date_filter !== 'all') {
      const range = getDateRange(date_filter);
      if (range) {
        url += `&created_at_min=${range.start.toISOString()}`;
        url += `&created_at_max=${range.end.toISOString()}`;
      }
    }

    // Fetch orders from Shopify
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    let { orders } = await response.json();

    // Apply search filter if provided
    if (search) {
      const term = search.toLowerCase();
      orders = orders.filter(order => 
        (order.name || '').toLowerCase().includes(term) ||
        `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.toLowerCase().includes(term)
      );
    }

    // Paginate results
    const startIdx = (page - 1) * limit;
    const paginated = orders.slice(startIdx, startIdx + limit);

    return res.json({
      orders: paginated,
      total_count: orders.length
    });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ 
      error: "Failed to process orders",
      details: error.message
    });
  }
});

// Helper function for date ranges
function getDateRange(filter) {
  const now = new Date();
  switch(filter) {
    case 'today':
      return { start: new Date(now.setHours(0,0,0,0)), end: now };
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { 
        start: new Date(yesterday.setHours(0,0,0,0)), 
        end: new Date(yesterday.setHours(23,59,59,999))
      };
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo, end: now };
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { start: monthAgo, end: now };
    default:
      return null;
  }
}

const fetchAllProducts = async (shop, accessToken) => {
  let products = [];
  let url = `https://${shop}/admin/api/2024-10/products.json`; // Update API version as needed

  while (url) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const data = await response.json();
    products = products.concat(data.products);

    // Check if there is another page of products and update the URL
    url = data.next_page_url || null;
  }

  return products;
};





const ZYLA_API_URL = 'https://zylalabs.com/api/4233/amazon+product+extractor+api/5155/product+information';
const API_ACCESS_KEY = '5892|xmNJ3slV06Zfh4pWGXzzFveNstX51nirwZ91tsiG'; 
app.get('/api/amazon-products', async (req, res) => {
  try {
    const asin = req.query.asin;  

    if (!asin) {
      return res.status(400).json({ error: 'ASIN is required' });
    }

    const response = await axios.get(ZYLA_API_URL, {
      params: {
        asin: asin, 
      },
      headers: {
        'Authorization': `Bearer ${API_ACCESS_KEY}`,  // Pass the API access key in the Authorization header
      },
    });

    // Check if the response contains product data
    if (response.data) {
      res.status(200).json(response.data); // Send the fetched product data to the frontend
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product from Amazon:', error);
    res.status(500).json({ error: 'Failed to fetch product from Amazon' });
  }
});

// Fetch the count of products
app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

// Add your product creation endpoint, etc.
app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

// Serve static files for the frontend
app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

// Catch-all route for the frontend
app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});


// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on ${PORT}`));