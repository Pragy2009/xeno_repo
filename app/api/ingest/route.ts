import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { shopUrl, accessToken, email } = await req.json();

  try {
    const tenant = await prisma.tenant.upsert({
      where: { email: email },
      update: {},
      create: { name: shopUrl, email: email }
    });

    // Fetch last 10 orders
    const response = await axios.get(`https://${shopUrl}/admin/api/2023-10/orders.json?status=any&limit=10`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const orders = response.data.orders;

    for (const order of orders) {
      await prisma.order.create({
        data: {
          shopifyId: String(order.id),
          amount: parseFloat(order.total_price),
          date: new Date(order.created_at),
          tenantId: tenant.id
        }
      });

      // --- NEW LOGIC STARTS HERE ---
      // We check Customer, then Billing, then Shipping, then Email
      
      let finalName = "Guest"; 
      let customerId = "guest_" + order.id; // Default ID if customer is null

      // 1. Try finding name in Customer Object
      if (order.customer) {
        customerId = String(order.customer.id);
        const first = order.customer.first_name || '';
        const last = order.customer.last_name || '';
        if (first || last) finalName = `${first} ${last}`.trim();
      }

      // 2. If still "Guest", try Billing Address
      if (finalName === "Guest" && order.billing_address) {
        finalName = order.billing_address.name || finalName;
      }

      // 3. If still "Guest", try Shipping Address
      if (finalName === "Guest" && order.shipping_address) {
        finalName = order.shipping_address.name || finalName;
      }

      // 4. If still "Guest", try Email
      if (finalName === "Guest" && order.email) {
        finalName = order.email;
      }

      // --- SAVE TO DB ---
      await prisma.customer.create({
        data: {
          shopifyId: customerId,
          name: finalName,
          totalSpent: parseFloat(order.total_price), // Use order price for this MVP
          tenantId: tenant.id
        }
      });
    }

    return NextResponse.json({ success: true, message: `Synced ${orders.length} orders!` });
  } catch (error: any) {
    console.error("Sync Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}