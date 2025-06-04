import {
 
  Page,
  IndexTable,
 
} from "@shopify/polaris";
import {  ProductOrderTable, DailySyncLogTable} from "../components";
import { useTranslation, Trans } from "react-i18next";
import { useEffect } from "react";




export default function HomePage() {
  const { t } = useTranslation();
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
        console.log("Fetched products:", data);  
      })
      .catch((error) => {
        console.error("There was an error!", error.message);  
      });
  }, []);  

  
  return (
    <Page fullWidth>
    <div className=""> 
{/* <Inventorybtn /> */}

</div>
 <div className="">

<ProductOrderTable />
{/* <Indecxtable /> */}
<DailySyncLogTable />
{/* <AmazonProduct /> */}
        
</div>

    </Page>
  );
}
