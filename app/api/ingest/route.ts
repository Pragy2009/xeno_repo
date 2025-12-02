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
    console.log(`Fetched ${orders.length} orders from Shopify`);

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

      // --- ULTIMATE NAME FINDER ---
      let finalName = "Guest"; 
      let customerId = "guest_" + order.id;

      // Debug: Print what Shopify actually sent us for this order
      console.log(`DEBUG ORDER ${order.id}:`, JSON.stringify(order.customer));

      if (order.customer) {
        customerId = String(order.customer.id);
        const first = order.customer.first_name;
        const last = order.customer.last_name;
        
        // 1. Check Standard Name
        if (first || last) {
            finalName = `${first || ''} ${last || ''}`.trim();
        } 
        // 2. Check Customer Email
        else if (order.customer.email) {
            finalName = order.customer.email;
        }
        // 3. Check Default Address (Common in Test Data)
        else if (order.customer.default_address) {
             const defFirst = order.customer.default_address.first_name;
             const defLast = order.customer.default_address.last_name;
             if (defFirst || defLast) {
                 finalName = `${defFirst || ''} ${defLast || ''}`.trim();
             }
        }
      }

      // 4. Check Top-Level Order Email
      if (finalName === "Guest" && order.email) {
        finalName = order.email;
      }
      // 5. Check Contact Email
      if (finalName === "Guest" && order.contact_email) {
        finalName = order.contact_email;
      }
      // 6. Check Billing Address
      if (finalName === "Guest" && order.billing_address?.name) {
        finalName = order.billing_address.name;
      }

      console.log(`FINAL DECISION for Order ${order.id}: "${finalName}"`);

      // 2. Customer Logic (Create OR Fix)
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
                name: finalName // Force update the name
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