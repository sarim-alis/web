import { BrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NavMenu } from "@shopify/app-bridge-react";
import Routes from "./Routes";

import { QueryProvider, PolarisProvider, Navigationbar, Topbar } from "./components";
import { TopBar } from "@shopify/polaris";

export default function App() {
  // Any .tsx or .jsx files in /pages will become a route
  // See documentation for <Routes /> for more info
  const pages = import.meta.glob("./pages/**/!(*.test.[jt]sx)*.([jt]sx)", {
    eager: true,
  });
  const { t } = useTranslation();

  return (
    <PolarisProvider>
      <BrowserRouter>
        <QueryProvider>
          <NavMenu>
           
          </NavMenu>
          <div className="main-section">
            <div className="menu-section">
            <Navigationbar />
            </div>
            <div className="content-section">
            <Topbar />

            <Routes pages={pages} />
            </div>
          </div>
         
        </QueryProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
