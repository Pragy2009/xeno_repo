import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { shopUrl, accessToken, email } = await req.json();

  try {
    // 1. Create or Update Tenant
    const tenant = await prisma.tenant.upsert({
      where: { email: email },
      update: {},
      create: { name: shopUrl, email: email }
    });

    // 2. Fetch Orders from Shopify (Limit 10 to prevent timeout)
    const response = await axios.get(`https://${shopUrl}/admin/api/2023-10/orders.json?status=any&limit=10`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const orders = response.data.orders;

    for (const order of orders) {
      // --- FIX: CHECK IF ORDER EXISTS BEFORE CREATING ---
      const existingOrder = await prisma.order.findFirst({
        where: { 
          shopifyId: String(order.id),
          tenantId: tenant.id 
        }
      });

      // Only create if it does NOT exist
      if (!existingOrder) {
        await prisma.order.create({
          data: {
            shopifyId: String(order.id),
            amount: parseFloat(order.total_price),
            date: new Date(order.created_at),
            tenantId: tenant.id
          }
        });
      }

      // --- NAME FINDING LOGIC ---
      let finalName = "Guest"; 
      let customerId = "guest_" + order.id;

      if (order.customer) {
        customerId = String(order.customer.id);
        const first = order.customer.first_name || '';
        const last = order.customer.last_name || '';
        if (first || last) finalName = `${first} ${last}`.trim();
      }
      
      if (finalName === "Guest" && order.billing_address) {
        finalName = order.billing_address.name || finalName;
      }
      if (finalName === "Guest" && order.shipping_address) {
        finalName = order.shipping_address.name || finalName;
      }
      if (finalName === "Guest" && order.email) {
        finalName = order.email;
      }

      // --- FIX: CHECK IF CUSTOMER EXISTS BEFORE CREATING ---
      const existingCustomer = await prisma.customer.findFirst({
        where: { 
          shopifyId: customerId,
          tenantId: tenant.id
        }
      });

      if (!existingCustomer) {
        await prisma.customer.create({
          data: {
            shopifyId: customerId,
            name: finalName,
            totalSpent: parseFloat(order.total_price),
            tenantId: tenant.id
          }
        });
      } else {
        // Optional: Update spend if they already exist
        await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: { 
                totalSpent: existingCustomer.totalSpent + parseFloat(order.total_price) 
            }
        });
      }
    }

    return NextResponse.json({ success: true, message: `Synced ${orders.length} orders successfully!` });
  } catch (error: any) {
    console.error("Sync Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}