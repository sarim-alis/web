import { useEffect, useState } from "react";
import { 
  Layout, 
  Card, 
  DataTable, 
  Button, 
  Pagination, 
  TextField, 
  Select, 
  EmptyState, 
  Spinner,
  ButtonGroup,
  Banner
} from "@shopify/polaris";

export function ProductOrderTable() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [queryValue, setQueryValue] = useState("");
  const [sortKey, setSortKey] = useState('title');
  const [filterType, setFilterType] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [showFilters, setShowFilters] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [error, setError] = useState(null);

  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Low Inventory', value: 'low_inventory' },
    { label: 'Out of Stock', value: 'out_of_stock' },
    { label: 'In Stock', value: 'in_stock' },
    { label: 'Has Orders', value: 'has_orders' },
    { label: 'Fulfilled Orders', value: 'fulfilled_orders' }
  ];

  const itemsPerPageOptions = [
    { label: '4', value: '4' },
    { label: '8', value: '8' },
    { label: '12', value: '12' },
  ];

  const customSelectStyles = {
    padding: '8px 12px',
    margin: '0 4px',
  };

  const fetchProducts = async (page) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/products/all?page=${page}&limit=${itemsPerPage}&filter=${filterType}&search=${queryValue}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      
      // Fetch order data for each product
      const productsWithOrders = await Promise.all(data.map(async (product) => {
        const ordersResponse = await fetch(
          `/api/orders/all?product_id=${product.id}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );
        
        if (!ordersResponse.ok) {
          return { ...product, totalOrders: 0, fulfilledOrders: 0 };
        }
        
        const ordersData = await ordersResponse.json();
        const totalOrders = ordersData.length;
        const fulfilledOrders = ordersData.filter(order => 
          order.fulfillment_status === "fulfilled"
        ).length;
        
        return {
          ...product,
          totalOrders,
          fulfilledOrders
        };
      }));

      // Replace products instead of accumulating them
      setProducts(productsWithOrders);
      setTotalProducts(data.total || data.length);
      setLoading(false);
    } catch (err) {
      setError("Failed to load products. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    setProducts([]); 
    fetchProducts(1); 
  }, [itemsPerPage, filterType, queryValue]);  

  const handleQueryChange = (value) => {
    setQueryValue(value);
    setCurrentPage(1); 
  };

  const getFilteredProducts = () => {
    return products
      .filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(queryValue.toLowerCase()) ||
                            product.variants[0]?.sku?.toLowerCase().includes(queryValue.toLowerCase());

        if (!matchesSearch) return false;

        switch (filterType) {
          case 'low_inventory':
            return product.variants[0]?.inventory_quantity < 10;
          case 'out_of_stock':
            return product.variants[0]?.inventory_quantity === 0;
          case 'in_stock':
            return product.variants[0]?.inventory_quantity > 0;
          case 'has_orders':
            return product.totalOrders > 0;
          case 'fulfilled_orders':
            return product.fulfilledOrders > 0;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        switch (sortKey) {
          case 'title':
            return a.title.localeCompare(b.title);
          case 'inventory':
            return (a.variants[0]?.inventory_quantity || 0) - (b.variants[0]?.inventory_quantity || 0);
          default:
            return 0;
        }
      });
  };

  const filteredProducts = getFilteredProducts();
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageRows = filteredProducts
    .slice(startIndex, endIndex)
    .map(product => {
      const variant = product.variants[0];
      return [
        <img 
          src={product.images[0]?.src} 
          alt={product.title} 
          style={{ width: "50px", height: "50px" }} 
        />,
        product.title,
        variant?.sku || 'N/A',
        variant?.inventory_quantity || 0,
        <h4>{product.totalOrders || 0}</h4>,
        <h4>{product.fulfilledOrders || 0}</h4>
      ];
    });  

  const handleEditProduct = (product) => {
    console.log("Edit Product:", product);
  };  

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchProducts(newPage);
  };

  const LoadingSpinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <Spinner accessibilityLabel="Loading products" size="large" />
    </div>
  );

  const ErrorBanner = () => error ? (
    <Banner status="critical" onDismiss={() => setError(null)}>
      <p>{error}</p>
    </Banner>
  ) : null;

  const FilterSection = () => (
    <div style={{ 
      display: 'flex', 
      gap: '20px', 
      marginBottom: '20px',
      flexWrap: 'wrap',
      padding: '16px',
      backgroundColor: '#f6f6f7',
      borderRadius: '8px'
    }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <TextField
          label="Search Products"
          value={queryValue}
          onChange={handleQueryChange}
          clearButton
          onClear={() => setQueryValue("")}
          placeholder="Search by title or SKU"
          autoComplete="off"
        />
      </div>
      <div style={{ minWidth: '200px' }}>
        <Select
          label="Filter Status"
          options={filterOptions}
          onChange={value => {
            setFilterType(value);
            setCurrentPage(1);
          }}
          value={filterType}
        />
      </div>
      <div style={{ minWidth: '150px' }}>
        <Select
          label="Items per page"
          options={itemsPerPageOptions}
          onChange={value => {
            setItemsPerPage(parseInt(value));
            setCurrentPage(1);
          }}
          value={itemsPerPage.toString()}
        />
      </div>
    </div>
  );

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  const TableFooter = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '16px',
      borderTop: '1px solid #dfe3e8'
    }}>
      <p>
        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalProducts)} - 
        {Math.min(currentPage * itemsPerPage, totalProducts)} of {totalProducts} products
      </p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button
          plain
          icon={<span>{'<<'}</span>}
          disabled={currentPage === 1}
          onClick={() => handlePageChange(1)}
          accessibilityLabel="First page"
        />
        <Button
          plain
          icon={<span>{'<'}</span>}
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          accessibilityLabel="Previous page"
        />
        {getPageNumbers().map(pageNum => (
          <Button
            key={pageNum}
            onClick={() => handlePageChange(pageNum)}
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
          disabled={currentPage * itemsPerPage >= totalProducts}
          onClick={() => handlePageChange(currentPage + 1)}
          accessibilityLabel="Next page"
        />
        <Button
          plain
          icon={<span>{'>>'}</span>}
          disabled={currentPage * itemsPerPage >= totalProducts}
          onClick={() => handlePageChange(Math.ceil(totalProducts / itemsPerPage))}
          accessibilityLabel="Last page"
        />
      </div>
    </div>
  );

  return (
    <Layout>
      <Layout.Section fullWidth>
        <Card title="Product Orders sara sarad">
          <Card.Section>
            <div style={{ marginBottom: '16px' }}>
              <Button onClick={() => setShowFilters(!showFilters)} primary>
                {showFilters ? '↑ Hide Filters' : '↓ Show Filters'}
              </Button>
            </div>

            <ErrorBanner />
            {showFilters && <FilterSection />}

            {loading && products.length === 0 ? <LoadingSpinner /> : (
              <>
                <DataTable
                  columnContentTypes={["text", "text", "text", "numeric", "numeric", "numeric"]}
                  headings={[
                    "Image",
                    "Title",
                    "SKU",
                    "Inventory",
                    "Orders",
                    "Fulfill"
                  ]}
                  rows={currentPageRows}
                  footerContent={loading ? "Loading more items..." : null}
                />
                <TableFooter />
              </>
            )}
          </Card.Section>
        </Card>
      </Layout.Section>

      
    </Layout>
  );
}
