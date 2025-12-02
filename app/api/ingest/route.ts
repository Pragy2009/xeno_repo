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
    console.log(`Fetched ${orders.length} orders`);

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

      // --- FIXED NAME LOGIC (No 'else' traps) ---
      let finalName = "Guest"; 
      let customerId = "guest_" + order.id;

      if (order.customer) {
        customerId = String(order.customer.id);
        
        // 1. Try Customer Object Name
        if (order.customer.first_name || order.customer.last_name) {
            finalName = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim();
        }
        
        // 2. Try Default Address Name (If we still don't have a name)
        if (finalName === "Guest" && order.customer.default_address) {
             const addr = order.customer.default_address;
             // Try 'name' property first, then first/last
             if (addr.name) {
                 finalName = addr.name;
             } else if (addr.first_name || addr.last_name) {
                 finalName = `${addr.first_name || ''} ${addr.last_name || ''}`.trim();
             }
        }

        // 3. Try Customer Email (Crucial Fallback!)
        if ((finalName === "Guest" || finalName === "") && order.customer.email) {
            finalName = order.customer.email;
        }
      }

      // 4. Try Top-level Email
      if ((finalName === "Guest" || finalName === "") && order.email) {
        finalName = order.email;
      }

      console.log(`ORDER ${order.id} FINAL NAME: "${finalName}"`);

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
        await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: { 
                totalSpent: existingCustomer.totalSpent + parseFloat(order.total_price),
                name: finalName // Force update
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