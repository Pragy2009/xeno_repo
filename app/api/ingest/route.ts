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

    // 1. Fetch Orders (API version upgraded to 2024-01)
    const response = await axios.get(`https://${shopUrl}/admin/api/2024-01/orders.json?status=any&limit=10`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const orders = response.data.orders;
    console.log(`Fetched ${orders.length} orders`);

    for (const order of orders) {
      // Create Order
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

      // --- NAME LOGIC ---
      let finalName = ""; 
      let customerId = "guest_" + order.id;

      // 1. Check Order Data (Basic Check)
      if (order.customer) {
        customerId = String(order.customer.id);
        if (order.customer.first_name || order.customer.last_name) {
             finalName = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`;
        } else if (order.customer.email) {
             finalName = order.customer.email;
        }
      }

      // 2. Check Addresses
      if (!finalName.trim() && order.billing_address?.name) finalName = order.billing_address.name;
      if (!finalName.trim() && order.shipping_address?.name) finalName = order.shipping_address.name;
      if (!finalName.trim() && order.email) finalName = order.email;

      // --- THE NUCLEAR FIX: Direct Customer Fetch ---
      // If we STILL don't have a name, and we have a Customer ID, fetch the profile directly.
      if ((!finalName.trim() || finalName === "Guest") && order.customer?.id) {
          try {
            console.log(`Fetching full profile for Customer ID: ${order.customer.id}`);
            const custRes = await axios.get(`https://${shopUrl}/admin/api/2024-01/customers/${order.customer.id}.json`, {
                headers: { 'X-Shopify-Access-Token': accessToken }
            });
            const fullCust = custRes.data.customer;
            
            if (fullCust.first_name || fullCust.last_name) {
                finalName = `${fullCust.first_name || ''} ${fullCust.last_name || ''}`;
            } else if (fullCust.email) {
                finalName = fullCust.email;
            } else if (fullCust.default_address?.name) {
                finalName = fullCust.default_address.name;
            }
            console.log(`...FOUND NAME IN PROFILE: "${finalName}"`);
          } catch (err) {
            console.error("Could not fetch customer profile (might be deleted/hidden).");
          }
      }

      // Final fallback
      if (!finalName.trim()) finalName = "Guest";
      finalName = finalName.trim();
      
      console.log(`ORDER ${order.id} FINAL DECISION: "${finalName}"`);

      // 3. Save to DB
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