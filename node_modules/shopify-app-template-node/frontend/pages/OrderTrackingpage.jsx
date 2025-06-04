import { Routes, Route } from "react-router-dom"; // Import Route from React Router
import { OrderTrackingModule } from "../components/OrderTrackingModule"; // Import the OrderTrackingModule component
import { OrderEditModule } from "../components/OrderEditModule"; // Import the OrderEditModule component
import { FulfillmentTracking } from "../components/FulfillmentTracking"; // Import the OrderEditModule component

export default function OrderTrackingPage() {
  return (
    <div>
      {/* This component displays the order tracking functionality */}
      <OrderTrackingModule />
    
     {/* <FulfillmentTracking />
      <Routes>
        <Route path="order/edit/:orderId" element={<OrderEditModule />} />
      </Routes> */}
    </div>
  );
}
