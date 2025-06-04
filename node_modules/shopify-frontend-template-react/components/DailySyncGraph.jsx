import * as React from 'react';
import { useState, useEffect } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { DatePicker, Button } from '@shopify/polaris';
import moment from 'moment';

export function SyncGraph() {
  // Initialize with proper Date objects
  const [selectedDates, setSelectedDates] = useState({
    start: new Date(),
    end: new Date(),
  });
  const [{month, year}, setDate] = useState({ 
    month: new Date().getMonth(), 
    year: new Date().getFullYear() 
  });
  const [graphData, setGraphData] = useState({
    days: [],
    orders: [],
    fulfillments: []
  });
  const [loading, setLoading] = useState(false);

  const handleMonthChange = (month, year) => {
    setDate({ month, year });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = selectedDates.start;
      const endDate = selectedDates.end;

      const ordersResponse = await fetch(
        `/api/orders/all?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      );
      const ordersData = await ordersResponse.json();

      const dateRange = getDateRange(startDate, endDate);
      const processedData = processOrdersData(ordersData, dateRange);
      setGraphData(processedData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const getDateRange = (start, end) => {
    const dates = [];
    let curr = new Date(start);
    while (curr <= end) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const processOrdersData = (orders, dateRange) => {
    const dayData = {
      days: dateRange.map(date => moment(date).format('MM/DD')),
      orders: new Array(dateRange.length).fill(0),
      fulfillments: new Array(dateRange.length).fill(0)
    };

    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const dayIndex = dateRange.findIndex(date => 
        date.toDateString() === orderDate.toDateString()
      );
      
      if (dayIndex !== -1) {
        dayData.orders[dayIndex]++;
        if (order.fulfillment_status === 'fulfilled') {
          dayData.fulfillments[dayIndex]++;
        }
      }
    });

    return dayData;
  };

  useEffect(() => {
    fetchData();
  }, [selectedDates]);

  return (
    <>
      <div className="Daily-sync-main-container">
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ minWidth: '200px' }}>
            <DatePicker
              month={month}
              year={year}
              onChange={({start, end}) => setSelectedDates({start, end})}
              onMonthChange={handleMonthChange}
              selected={selectedDates}
              allowRange
            />
          </div>
          {/* <Button onClick={fetchData} primary style={{ backgroundColor: '#2e7d32', border: 'none' }}>
            Update Graph
          </Button> */}
        </div>

        <div className="specify-categories">
          <div style={{ 
            padding: '8px 16px',
            borderRadius: '4px',
            fontWeight: 500,
            cursor: 'pointer',
            background: '#E3F2FD',
            color: '#1976D2'  // Nice blue
          }}>
            Orders
          </div>
          <div style={{ 
            padding: '8px 16px',
            borderRadius: '4px',
            fontWeight: 500,
            cursor: 'pointer',
            background: '#F3E5F5',
            color: '#7B1FA2'  // Pleasant purple
          }}>
            Fulfillment
          </div>
        </div>

        <BarChart
          xAxis={[{ 
            scaleType: 'band', 
            data: graphData.days
          }]}
          series={[
            { data: graphData.orders, label: 'Orders', color: '#1976D2' },  // Matching blue
            { data: graphData.fulfillments, label: 'Fulfillments', color: '#7B1FA2' }  // Matching purple
          ]}
          width={800}
          height={400}
          legend={{ 
            position: 'top',
            padding: 20
          }}
        />
      </div>
    </>
  );
}

