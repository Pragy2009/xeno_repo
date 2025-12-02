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

      // --- THE ULTIMATE NAME FINDER ---
      let finalName = ""; 
      let customerId = "guest_" + order.id;

      // 1. Check Customer Object
      if (order.customer) {
        customerId = String(order.customer.id);
        if (order.customer.first_name || order.customer.last_name) {
            finalName = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`;
        }
        // 2. Check Customer Default Address
        else if (order.customer.default_address) {
             const addr = order.customer.default_address;
             if (addr.name) finalName = addr.name;
             else if (addr.first_name || addr.last_name) finalName = `${addr.first_name || ''} ${addr.last_name || ''}`;
        }
        // 3. Check Customer Email
        else if (order.customer.email) {
            finalName = order.customer.email;
        }
      }

      // 4. Check Billing Address (Common in Test Data!)
      if (!finalName.trim() && order.billing_address) {
          if (order.billing_address.name) finalName = order.billing_address.name;
          else if (order.billing_address.first_name) finalName = `${order.billing_address.first_name} ${order.billing_address.last_name || ''}`;
      }

      // 5. Check Shipping Address
      if (!finalName.trim() && order.shipping_address) {
          if (order.shipping_address.name) finalName = order.shipping_address.name;
          else if (order.shipping_address.first_name) finalName = `${order.shipping_address.first_name} ${order.shipping_address.last_name || ''}`;
      }

      // 6. Check Order Email
      if (!finalName.trim() && order.email) {
          finalName = order.email;
      }
      
      // 7. Check Contact Email
      if (!finalName.trim() && order.contact_email) {
          finalName = order.contact_email;
      }

      // Final Fallback
      if (!finalName.trim()) {
          finalName = "Guest";
      }

      finalName = finalName.trim();
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
        // Force Update Name
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