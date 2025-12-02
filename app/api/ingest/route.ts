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

    const response = await axios.get(`https://${shopUrl}/admin/api/2023-10/orders.json?status=any&limit=10`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const orders = response.data.orders;
    console.log(`Fetched ${orders.length} orders from Shopify`); // Debug Log

    for (const order of orders) {
      // 1. Create Order safely
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

      // --- NAME HUNTING LOGIC ---
      let finalName = "Guest"; 
      let customerId = "guest_" + order.id;

      if (order.customer) {
        customerId = String(order.customer.id);
        const first = order.customer.first_name || '';
        const last = order.customer.last_name || '';
        
        // Strategy A: Customer Object
        if (first || last) {
            finalName = `${first} ${last}`.trim();
        } 
        // Strategy B: Customer Email
        else if (order.customer.email) {
            finalName = order.customer.email;
        }
      }

      // Strategy C: Billing/Shipping
      if (finalName === "Guest" && order.billing_address?.name) {
        finalName = order.billing_address.name;
      }
      if (finalName === "Guest" && order.shipping_address?.name) {
        finalName = order.shipping_address.name;
      }

      // Debug Log: Check what name we actually found
      console.log(`Order ${order.id}: Found Name = "${finalName}"`);

      // 2. Customer Logic (Create OR Fix)
      const existingCustomer = await prisma.customer.findFirst({
        where: { shopifyId: customerId, tenantId: tenant.id }
      });

      if (!existingCustomer) {
        // Create new
        await prisma.customer.create({
          data: {
            shopifyId: customerId,
            name: finalName,
            totalSpent: parseFloat(order.total_price),
            tenantId: tenant.id
          }
        });
      } else {
        // UPDATE: Fix the name if it was "Guest" before!
        await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: { 
                totalSpent: existingCustomer.totalSpent + parseFloat(order.total_price),
                name: finalName // <--- THIS FORCES THE NAME FIX
            }
        });
      }
    }

    return NextResponse.json({ success: true, message: `Synced ${orders.length} orders!` });
  } catch (error: any) {
    console.error("Sync Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}