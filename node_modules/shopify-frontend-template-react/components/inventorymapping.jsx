import React from 'react';
import { Layout, Card, Button} from '@shopify/polaris';
import { NavLink } from 'react-router-dom';

export function Inventorybtn() {
  return (
    <Layout>
      <Layout.Section fullWidth>
      
    <Card>
          <Card.Section>
        <div className='ancer-class-main'>
          <NavLink to="/pagename" className="ancer-class">
              <Button variant="primary">MAPPING PRODUCT</Button>
          </NavLink>
          </div>
  
          </Card.Section>
        </Card>
        </Layout.Section>
        </Layout>
      
  );
}