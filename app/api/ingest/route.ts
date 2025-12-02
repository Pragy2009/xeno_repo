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

    const response = await axios.get(`https://${shopUrl}/admin/api/2024-01/orders.json?status=any&limit=10`, {
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

      // --- DEBUG LOG ---
      // This will show us EXACTLY what Shopify is sending for the customer
      if (order.customer) {
          console.log(`DEBUG RAW CUSTOMER DATA (Order ${order.id}):`, JSON.stringify(order.customer));
      } else {
          console.log(`DEBUG: Order ${order.id} has NO customer object.`);
      }

      // --- NAME LOGIC ---
      let finalName = ""; 
      let customerId = "guest_" + order.id;

      if (order.customer) {
        customerId = String(order.customer.id);
        
        // 1. Try Standard Name
        if (order.customer.first_name || order.customer.last_name) {
             finalName = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`;
        } 
        // 2. Try Default Address
        else if (order.customer.default_address) {
             const addr = order.customer.default_address;
             if (addr.name) finalName = addr.name;
             else if (addr.first_name) finalName = `${addr.first_name || ''} ${addr.last_name || ''}`;
        }
        // 3. Try Email
        else if (order.customer.email) {
             finalName = order.customer.email;
        }
      }

      // 4. Fallback Checks
      if (!finalName.trim() && order.billing_address?.name) finalName = order.billing_address.name;
      if (!finalName.trim() && order.shipping_address?.name) finalName = order.shipping_address.name;
      if (!finalName.trim() && order.email) finalName = order.email;

      // 5. Final Fallback: Use Customer ID instead of "Guest"
      // This ensures they at least show up as different people on the graph!
      if (!finalName.trim() && order.customer?.id) {
          finalName = `Customer #${order.customer.id}`; 
      }
      
      if (!finalName.trim()) finalName = "Guest";
      
      finalName = finalName.trim();
      console.log(`ORDER ${order.id} FINAL NAME: "${finalName}"`);

      // 2. Save Customer
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