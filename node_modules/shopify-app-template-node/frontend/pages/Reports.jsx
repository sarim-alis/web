import React, {useEffect, useState} from "react";
import {
  Page, 
  IndexTable, 
  Text, 
  Card, 
  Select, 
  Stack, 
  Button, 
  TextField,
  Spinner,
  Banner,
  Badge
} from "@shopify/polaris";
import { SearchIcon } from '@shopify/polaris-icons';

export default function Reports() {
  const [orders, setOrders]   = useState([]);
  const [error,  setError]    = useState("");
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100; 

  const filterOptions = [
    {label: 'All Orders', value: 'all'},
    {label: 'Paid', value: 'paid'},
    {label: 'Unpaid', value: 'unpaid'},
    {label: 'Fulfilled', value: 'fulfilled'},
    {label: 'Unfulfilled', value: 'unfulfilled'}
  ];

  const dateFilterOptions = [
    {label: 'All Time', value: 'all'},
    {label: 'Today', value: 'today'},
    {label: 'Yesterday', value: 'yesterday'},
    {label: 'Last 7 Days', value: 'week'},
    {label: 'Last 30 Days', value: 'month'}
  ];

  useEffect(() => {
    setLoading(true);
    fetch("/api/orders/all", {
      credentials: "include",       
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // Handle error object from backend
        if (Array.isArray(data)) {
          setOrders(data);
          setTotalOrders(data.length);
        } else if (data && data.error) {
          setError(data.error);
        } else {
          setOrders([]);
          setTotalOrders(0);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filterOrders = () => {
    let filtered = [...orders];

    // Simplified search filter
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase();
      filtered = filtered.filter(order => {
        const orderId = (order.name || order.id).toLowerCase();
        const customerName = `${order.customer?.first_name ?? ""} ${order.customer?.last_name ?? ""}`.toLowerCase();
        return orderId.includes(searchTerm) || customerName.includes(searchTerm);
      });
    }

    // Status filter
    if (filterType !== 'all') {
      filtered = filtered.filter(order => {
        switch (filterType) {
          case 'paid':
            return order.financial_status === 'paid';
          case 'unpaid':
            return order.financial_status === 'unpaid';
          case 'fulfilled':
            return order.fulfillment_status === 'fulfilled';
          case 'unfulfilled':
            return !order.fulfillment_status;
          default:
            return true;
        }
      });
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    filtered = filtered.filter(order => {
      const orderDate = new Date(order.created_at);
      switch (dateFilter) {
        case 'today':
          return orderDate >= today;
        case 'yesterday':
          return orderDate >= yesterday && orderDate < today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          return orderDate >= monthAgo;
        default:
          return true;
      }
    });

    return filtered;
  };

  const filteredOrders = filterOrders();

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <Page title="Order Reports">
        <Banner status="critical" title="Error" onDismiss={() => setError("")}>
          <p>{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      title="Order Reports"
      subtitle={`Total Orders: ${totalOrders}`}
    >
      <Card>
        <Card.Section>
          <Stack vertical spacing="tight">
            <Stack distribution="fillEvenly" alignment="center">
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isSearchVisible ? (
                  <div style={{ flex: 1 }}>
                    <TextField
                      label=""
                      value={searchValue}
                      onChange={setSearchValue}
                      clearButton
                      onClear={() => {
                        setSearchValue("");
                        setIsSearchVisible(false);
                      }}
                      placeholder="Search by Order ID or Customer Name"
                      autoFocus
                    />
                  </div>
                ) : (
                  <Button 
                    icon={SearchIcon}
                    onClick={() => setIsSearchVisible(true)}
                  >
                    Search Orders
                  </Button>
                )}
              </div>
            </Stack>
            <Stack distribution="fillEvenly" alignment="center">
              <div style={{ minWidth: '200px' }}>
                <Select
                  label="Filter by Status"
                  options={filterOptions}
                  onChange={setFilterType}
                  value={filterType}
                />
              </div>
              <div style={{ minWidth: '200px' }}>
                <Select
                  label="Filter by Date"
                  options={dateFilterOptions}
                  onChange={setDateFilter}
                  value={dateFilter}
                />
              </div>
              <div style={{ marginTop: '22px' }}>
                <Button onClick={() => {
                  setFilterType('all');
                  setDateFilter('all');
                  setSearchValue('');
                  setIsSearchVisible(false);
                }}>Clear All</Button>
              </div>
            </Stack>
          </Stack>
        </Card.Section>
        <Card.Section>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spinner accessibilityLabel="Loading orders" size="large" />
              <div style={{ marginTop: '16px' }}>Loading orders...</div>
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text variant="bodyMd" as="p" color="subdued">
                No orders found matching your criteria
              </Text>
            </div>
          ) : (
            <IndexTable
              resourceName={{singular: "order", plural: "orders"}}
              itemCount={paginatedOrders.length}
              headings={[
                {title: "Order ID"},
                {title: "Customer"},
                {title: "Email"},
                {title: "Status"},
                {title: "Total"},
                {title: "Created at"},
              ]}
              selectable={false}
            >
              {paginatedOrders.map((order, index) => (
                <IndexTable.Row
                  id={order.id.toString()}
                  key={order.id}
                  position={index}
                >
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      {order.name || order.id}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Stack vertical spacing="extraTight">
                      <Text variant="bodyMd">
                        {`${order.customer?.first_name ?? ""} ${order.customer?.last_name ?? ""}`}
                      </Text>
                    </Stack>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {order.email || 'No email'}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge 
                      status={order.fulfillment_status === 'fulfilled' ? 'success' : 'attention'}
                    >
                      {order.fulfillment_status || 'Unfulfilled'}
                    </Badge>
                    <Badge 
                      status={order.financial_status === 'paid' ? 'success' : 'critical'}
                    >
                      {order.financial_status || 'Unpaid'}
                    </Badge>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      {order.total_price_set ? 
                        `${order.total_price_set.shop_money.currency_code} ${order.total_price_set.shop_money.amount}` 
                        : order.total_price ? 
                          `${order.currency || 'USD'} ${parseFloat(order.total_price).toFixed(2)}` 
                          : '—'
                      }
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {new Date(order.created_at).toLocaleString()}
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          )}
        </Card.Section>

        {/* Pagination Controls */}
        <Card.Section>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px 0' }}>
            <Button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              plain
            >
              Prev
            </Button>
            {[...Array(totalPages)].map((_, idx) => (
              <Button
                key={idx + 1}
                onClick={() => handlePageChange(idx + 1)}
                primary={currentPage === idx + 1}
                plain={currentPage !== idx + 1}
                size="slim"
              >
                {idx + 1}
              </Button>
            ))}
            <Button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => handlePageChange(currentPage + 1)}
              plain
            >
              Next
            </Button>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text variant="bodyMd" as="p" color="subdued">
              Showing {paginatedOrders.length} of {filteredOrders.length} filtered orders (Page {currentPage} of {totalPages})
            </Text>
          </div>
        </Card.Section>
      </Card>
    </Page>
  );
}
