import { Label, Layout, LegacyCard } from '@shopify/polaris'
import { storeData } from '../../datastore'
import { Line ,Doughnut,Bar } from 'react-chartjs-2'
import { Chart as ChartJS } from 'chart.js/auto'

import React, { useState } from 'react'

export function OrderGraph() {
    let [data,setData]=useState({
        labels: storeData.map((d)=> d.year ),
        datasets:[
            {
                label:"Orders Details",
                data: storeData.map((d)=> d.order),
            }
        ]
    })
  return (
    <div>
    <Layout >

        <Layout.Section oneFull>
          <LegacyCard title=" online store" sectioned>
          <Line data={data} />
          </LegacyCard>
        </Layout.Section>
        <Layout.Section oneThird>
          <LegacyCard title="Online store dashboardd" sectioned>
           <Doughnut data={data} />
          </LegacyCard>
        </Layout.Section>
        <Layout.Section oneThird>
          <LegacyCard title="Online store dashboard" sectioned>
          <Bar data={data} />

          </LegacyCard>
        </Layout.Section>
        <Layout.Section oneThird>
          <LegacyCard title="Online store dashboard" sectioned>
          <Bar data={data} />

          </LegacyCard>
        </Layout.Section>
      </Layout>
    </div>
  )
}

