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

    // Fetch Orders
    const response = await axios.get(`https://${shopUrl}/admin/api/2023-10/orders.json?status=any&limit=10`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const orders = response.data.orders;
    console.log(`Fetched ${orders.length} orders from Shopify`);

    for (const order of orders) {
      // 1. Create Order
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

      // --- NAME EXTRACTION LOGIC ---
      let finalName = "Guest"; 
      let customerId = "guest_" + order.id;

      // Debug: THIS WILL PROVE IF WE ARE RUNNING NEW CODE
      console.log(`PROCESSING ORDER ${order.id} ---`);

      if (order.customer) {
        customerId = String(order.customer.id);
        
        // Check 1: Standard Name
        if (order.customer.first_name || order.customer.last_name) {
            finalName = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`;
        }
        // Check 2: Default Address (This matches your Screenshot!)
        else if (order.customer.default_address) {
            console.log("Found Default Address!"); // Debug
            const addr = order.customer.default_address;
            if (addr.first_name || addr.last_name) {
                finalName = `${addr.first_name || ''} ${addr.last_name || ''}`;
            }
        }
        // Check 3: Email
        else if (order.customer.email) {
            finalName = order.customer.email;
        }
      }

      finalName = finalName.trim();
      console.log(`FINAL NAME DECISION: "${finalName}"`);

      // 2. Save/Update Customer
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
        // FORCE UPDATE NAME
        await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: { 
                totalSpent: existingCustomer.totalSpent + parseFloat(order.total_price),
                name: finalName 
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