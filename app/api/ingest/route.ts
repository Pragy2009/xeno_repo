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

    // Fetch orders (limit 10)
    const response = await axios.get(`https://${shopUrl}/admin/api/2023-10/orders.json?status=any&limit=10`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const orders = response.data.orders;

    for (const order of orders) {
      // 1. Create Order if not exists
      const existingOrder = await prisma.order.findFirst({
        where: { shopifyId: String(order.id), tenantId: tenant.id }
      });

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

      // --- IMPROVED NAME LOGIC ---
      let finalName = "Guest"; 
      let customerId = "guest_" + order.id;

      if (order.customer) {
        customerId = String(order.customer.id);
        const first = order.customer.first_name || '';
        const last = order.customer.last_name || '';
        
        // Priority 1: Real Name
        if (first || last) {
            finalName = `${first} ${last}`.trim();
        } 
        // Priority 2: Customer Email (The Fix!)
        else if (order.customer.email) {
            finalName = order.customer.email;
        }
      }

      // Priority 3: Billing Name
      if (finalName === "Guest" && order.billing_address) {
        finalName = order.billing_address.name || finalName;
      }

      // 2. Create/Update Customer
      const existingCustomer = await prisma.customer.findFirst({
        where: { shopifyId: customerId, tenantId: tenant.id }
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
        // Update spend
        await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: { totalSpent: existingCustomer.totalSpent + parseFloat(order.total_price) }
        });
      }
    }

    return NextResponse.json({ success: true, message: `Synced ${orders.length} orders!` });
  } catch (error: any) {
    console.error("Sync Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}