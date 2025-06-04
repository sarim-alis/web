// OrderTrackingModule.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layout,
  Card,
  DataTable,
  Button,
  Pagination,
  TextField,
  Modal,
  Form,
  TextContainer,
  Select,
  Stack,
} from "@shopify/polaris";

export function OrderTrackingModule() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [queryValue, setQueryValue] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const rowsPerPage = 5;

  const navigate = useNavigate();

  const filterOptions = [
    { label: "All Orders", value: "all" },
    { label: "Fulfilled", value: "fulfilled" },
    { label: "Unfulfilled", value: "unfulfilled" },
    { label: "Paid", value: "paid" },
    { label: "Unpaid", value: "unpaid" },
  ];

  const dateFilterOptions = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "week" },
    { label: "Last 30 Days", value: "month" },
  ];

  // Fetch unfulfilled orders on mount
  useEffect(() => {
    fetch("/api/orders/all", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        // Ensure we always have an array
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data.orders)
          ? data.orders
          : [];
        setOrders(arr);
      })
      .catch((error) => {
        console.error("Error fetching orders:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Search handler
  const handleQueryChange = (value) => {
    setQueryValue(value);
    setCurrentPage(1);
  };

  // Updated filter logic
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = (order.name ?? "")
      .toLowerCase()
      .includes(queryValue.toLowerCase());
    const matchesFilter =
      filterType === "all"
        ? true
        : filterType === "fulfilled"
        ? order.fulfillment_status === "fulfilled"
        : filterType === "unfulfilled"
        ? !order.fulfillment_status
        : filterType === "paid"
        ? order.financial_status === "paid"
        : filterType === "unpaid"
        ? order.financial_status === "unpaid"
        : true;

    const orderDate = new Date(order.created_at);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const matchesDate =
      dateFilter === "all"
        ? true
        : dateFilter === "today"
        ? orderDate >= today
        : dateFilter === "yesterday"
        ? orderDate >= new Date(today - 86400000) && orderDate < today
        : dateFilter === "week"
        ? orderDate >= new Date(today - 7 * 86400000)
        : dateFilter === "month"
        ? orderDate >= new Date(today - 30 * 86400000)
        : true;

    return matchesSearch && matchesFilter && matchesDate;
  });

  const getFulfillmentStyle = (status) => {
    return {
      backgroundColor: status === "fulfilled" ? "#e3f1eb" : status === "Unfulfilled" ? "#ffebee" : "transparent",
      padding: "8px",
      borderRadius: "4px"
    };
  };

  const tableCellStyle = {
    textAlign: 'center',
  };

  // Update rows building logic
  const rows = filteredOrders.map((order) => {
    const email = order.email ?? "N/A";
    const financial = order.financial_status ?? "N/A";
    const fulfillment = order.fulfillment_status ?? "Unfulfilled";
    const trackNum = order.tracking_number ?? "—";
    const shippingMethod = order.shipping_lines?.[0]?.title ?? "N/A";

    return [
      <div style={tableCellStyle}>{order.name ?? "(no name)"}</div>,
      <div style={tableCellStyle}>{email}</div>,
      <div style={tableCellStyle}>{financial}</div>,
      <div style={{...tableCellStyle, ...getFulfillmentStyle(fulfillment)}}>
        {fulfillment}
      </div>,
      <div style={tableCellStyle}>{shippingMethod}</div>,
      <div style={tableCellStyle}>{trackNum}</div>,
      <div style={tableCellStyle}>
        <Button key="assign" onClick={() => setSelectedOrder(order)}>
          Assign Tracking
        </Button>
      </div>,
    ];
  });

  // Pagination slicing
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentPageRows = rows.slice(startIndex, startIndex + rowsPerPage);

  // Add these helper functions for pagination
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  
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

  // Replace the existing Pagination component with this new one
  const PaginationMarkup = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '16px 0' }}>
      <Button
        plain
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(1)}
      >
        {'<<'}
      </Button>
      <Button
        plain
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(p => p - 1)}
      >
        {'<'}
      </Button>
      {getPageNumbers().map(pageNum => (
        <Button
          key={pageNum}
          onClick={() => setCurrentPage(pageNum)}
          primary={currentPage === pageNum}
          plain={currentPage !== pageNum}
        >
          {pageNum}
        </Button>
      ))}
      <Button
        plain
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage(p => p + 1)}
      >
        {'>'}
      </Button>
      <Button
        plain
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage(totalPages)}
      >
        {'>>'}
      </Button>
    </div>
  );

  // In the return statement, replace the existing Pagination component with PaginationMarkup
  return (
    <Layout>
      <Layout.Section fullWidth>
        <Card title="Order Tracking Management">
          <Card.Section>
            {/* Filter Toggle Button */}
            <div style={{ marginBottom: "16px" }}>
              <Button onClick={() => setShowFilters(!showFilters)} primary>
                {showFilters ? "↑ Hide Filters" : "↓ Show Filters"}
              </Button>
            </div>

            {/* Filter Section */}
            {showFilters && (
              <Stack distribution="fillEvenly" spacing="loose">
                <TextField
                  label="Search orders"
                  value={queryValue}
                  onChange={handleQueryChange}
                  clearButton
                  onClear={() => setQueryValue("")}
                />
                <Select
                  label="Filter Status"
                  options={filterOptions}
                  onChange={setFilterType}
                  value={filterType}
                />
                <Select
                  label="Filter Date"
                  options={dateFilterOptions}
                  onChange={setDateFilter}
                  value={dateFilter}
                />
                <Button
                  onClick={() => {
                    setFilterType("all");
                    setDateFilter("all");
                    setQueryValue("");
                  }}
                >
                  Clear Filters
                </Button>
              </Stack>
            )}

            {loading ? (
              <TextContainer>Loading orders…</TextContainer>
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
                  headings={[
                    "Order Name",
                    "Customer Email",
                    "Payment Status",
                    "Fulfillment Status",
                    "Shipping Method",
                    "Tracking Number",
                    "Assign Tracking",
                  ]}
                  rows={currentPageRows}
                />

                <PaginationMarkup />
              </>
            )}
          </Card.Section>
        </Card>
      </Layout.Section>

      {/* Modal for assigning tracking */}
      {selectedOrder && (
        <Modal
          open={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Assign Tracking for ${selectedOrder.name}`}
          primaryAction={{
            content: "Save",
            onAction: () => {
              // call your fulfillment-details API here, then:
              setSelectedOrder(null);
            },
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setSelectedOrder(null),
            },
          ]}
        >
          <Modal.Section>
            <Form onSubmit={() => {}}>
              <TextField
                label="Tracking Number"
                value={trackingNumber}
                onChange={setTrackingNumber}
                autoFocus
                placeholder="Enter tracking #"
              />
            </Form>
          </Modal.Section>
        </Modal>
      )}
    </Layout>
  );
}
