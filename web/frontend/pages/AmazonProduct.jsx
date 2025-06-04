import React, { useEffect, useState } from 'react';
import { Card, Button } from '@shopify/polaris'; // Assuming you're using Polaris components for the UI

const AmazonProduct = () => {
  const [product, setProduct] = useState(null);  // State to hold product data
  const [loading, setLoading] = useState(true);  // State to manage loading state
  const [error, setError] = useState(null);      // State for error handling

  // Function to fetch Amazon product data based on ASIN
  const fetchAmazonProduct = async (asin) => {
    try {
      const response = await fetch(`/api/amazon-products?asin=${asin}`);
      const data = await response.json();

      if (response.ok) {
        setProduct(data?.body);  // Assuming 'body' contains the actual product data
        console.log("Product Data:", data?.body);  // Log the product data for debugging
      } else {
        setError(data?.error || 'An unknown error occurred');  // Provide a fallback error message
      }
    } catch (err) {
      setError('Error fetching product data');
      console.error('Error fetching Amazon product:', err);
    } finally {
      setLoading(false);
    }
  };

  // Example ASIN (Amazon Product Identifier)
  const asin = 'B09LNT1F3H';

  // Use effect to call the function when the component is mounted
  useEffect(() => {
    fetchAmazonProduct(asin);
  }, [asin]);  // Dependency array ensures it's called only when ASIN changes

  // Log product state when it changes for debugging
  useEffect(() => {
    console.log('Product state:', product);
  }, [product]);

  // Render the product or loading/error message
  return (
    <Card title="Amazon Product" sectioned>
      {loading ? (
        <p>Loading product details...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        product && (
          <div>
            {/* Check if the product details exist and provide defaults */}
            <h2>{product.name || 'Title not available'}</h2>
            <p>{product.description || 'No description available'}</p>

            {/* Use a fallback image if the product image is unavailable */}
            <img 
              src={product?.mainImage || '/path/to/default-image.jpg'} 
              alt={product?.name || 'Product Image'} 
              style={{ width: '200px', height: 'auto' }} 
            />

            <p>Price: {product?.currency} {product?.price || 'N/A'}</p>

            {/* Ensure the product URL exists before rendering the button */}
            {product?.url && (
              <Button onClick={() => window.open(product.url, '_blank')}>View on Amazon</Button>
            )}
          </div>
        )
      )}
    </Card>
  );
};

export default AmazonProduct;
