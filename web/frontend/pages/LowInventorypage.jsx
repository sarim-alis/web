import {
 
  Page,
  IndexTable,
 
} from "@shopify/polaris";
import {  } from "../components";
import { useTranslation, Trans } from "react-i18next";
import { useEffect } from "react";
import { LowInventoryProducts } from "../components/LowInventoryProducts";
// import { InventoryItems } from "../components/InventoryItems";




export default function HomePage() {
  const { t } = useTranslation();

  return (
    <Page fullWidth>
    <div className=""> 
<LowInventoryProducts />
{/* <InventoryItems /> */}
</div>

    </Page>
  );
}
