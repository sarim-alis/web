import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  SettingsIcon
} from '@shopify/polaris-icons';
import { Icon } from "@shopify/polaris";
import {
  HomeIcon
} from '@shopify/polaris-icons';
import {
  ChevronRightIcon,
  ChevronLeftIcon
} from '@shopify/polaris-icons';
import {
  ChartHistogramFirstIcon
} from '@shopify/polaris-icons';

import {
  RefreshIcon
} from '@shopify/polaris-icons';
import {
  ProductFilledIcon
} from '@shopify/polaris-icons';
import {
  OrderIcon
} from '@shopify/polaris-icons';
import Sitelogo from '/assets/logo.png';
import Collapsedlogo from '/assets/collapsed-logo.png';


export function Navigationbar() {
  // State to track whether the sidebar is collapsed or not
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Function to toggle the sidebar collapse state
  const toggleSidebar = () => {
    setIsCollapsed(prevState => !prevState);
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Toggle button to collapse/expand the sidebar */}
      <button className="toggle-btn" onClick={toggleSidebar}>
                  {isCollapsed ? <div className="right-icon sidebar-icon">

                  <Icon
                    source={ChevronRightIcon}
                    tone="base"
                  /> </div> : <div className="left-icon sidebar-icon"> <Icon
                    source={ChevronLeftIcon}
                    tone="base"
                  /> </div> } 
      </button>
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="logo-collapsed">
            <img src={ Collapsedlogo } alt="app logo" />
                      </div>
         <div className="app-logo">
           <img src={ Sitelogo } alt="" />
           </div>
           <div className="prod-map">
            <h4>Product Mapping</h4>
           </div>
        </div>
      </div>
      <ul className="menu">
        <li>
          <NavLink to="/" className="ancer-class" title='Dashboard'>
            <i className="fa-solid fa-house"></i><span className='sidebar-icons-spain'><Icon
  source={HomeIcon}
  tone="base"/><h2 className='sidebar-icon-text'>Dashboard</h2></span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/AmazonProduct" className="ancer-class" title='Products'>
            <i className="fa-solid fa-envelope"></i><span className='sidebar-icons-spain'><Icon
  source={ProductFilledIcon}
  tone="base"
/><h2 className='sidebar-icon-text' >Products</h2></span>
          </NavLink>
        </li>
     
      
        <li>
          <NavLink to="/reports" className="ancer-class" title='Reports'>
                          <i className="fa-solid fa-right-from-bracket"></i><span className='sidebar-icons-spain'>
                          <Icon
  source={OrderIcon}
  tone="base"
/>
              <h2 className='sidebar-icon-text'>New Orders</h2></span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/OrderTrackingpage" className="ancer-class" title='OrderTrackingpage'>
                          <i className="fa-solid fa-right-from-bracket"></i><span className='sidebar-icons-spain'>
                          <Icon
  source={OrderIcon}
  tone="base"
/>
              <h2 className='sidebar-icon-text'>Order Tracking</h2></span>
          </NavLink>
        </li>
        <li>
          
          {/* <NavLink to="/LowInventorypage" className="ancer-class" title='LowInventorypage'>
            <i className="fa-solid fa-chart-column"></i><span className='sidebar-icons-spain'><Icon
              source={SettingsIcon}
              tone="base"

            /><h2 className='sidebar-icon-text'>LowInventoryProducts</h2></span>
          </NavLink> */}

          <NavLink to="/LowInventoryProductsnew" className="ancer-class" title='LowInventoryProductsnew'>
            <i className="fa-solid fa-chart-column"></i><span className='sidebar-icons-spain'><Icon
              source={SettingsIcon}
              tone="base"

            /><h2 className='sidebar-icon-text'>LowInventoryProducts</h2></span>
          </NavLink>
        </li>
        <li>
          
          <NavLink to="/settings" className="ancer-class" title='Settings'>
            <i className="fa-solid fa-chart-column"></i><span className='sidebar-icons-spain'><Icon
              source={SettingsIcon}
              tone="base"

            /><h2 className='sidebar-icon-text'>Settings</h2></span>
          </NavLink>
        </li>
     
      </ul>
    </div>
  );
}
