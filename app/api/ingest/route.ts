// import { NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';
// import axios from 'axios';

// const prisma = new PrismaClient();

// export async function POST(req: Request) {
//   const { shopUrl, accessToken, email } = await req.json();

//   try {
//     const tenant = await prisma.tenant.upsert({
//       where: { email: email },
//       update: {},
//       create: { name: shopUrl, email: email }
//     });

//     // Fetch last 10 orders
//     const response = await axios.get(`https://${shopUrl}/admin/api/2023-10/orders.json?status=any&limit=10`, {
//       headers: { 'X-Shopify-Access-Token': accessToken }
//     });

//     const orders = response.data.orders;

//     for (const order of orders) {
//       await prisma.order.create({
//         data: {
//           shopifyId: String(order.id),
//           amount: parseFloat(order.total_price),
//           date: new Date(order.created_at),
//           tenantId: tenant.id
//         }
//       });

//       // --- NEW LOGIC STARTS HERE ---
//       // We check Customer, then Billing, then Shipping, then Email
      
//       let finalName = "Guest"; 
//       let customerId = "guest_" + order.id; // Default ID if customer is null

//       // 1. Try finding name in Customer Object
//       if (order.customer) {
//         customerId = String(order.customer.id);
//         const first = order.customer.first_name || '';
//         const last = order.customer.last_name || '';
//         if (first || last) finalName = `${first} ${last}`.trim();
//       }

//       // 2. If still "Guest", try Billing Address
//       if (finalName === "Guest" && order.billing_address) {
//         finalName = order.billing_address.name || finalName;
//       }

//       // 3. If still "Guest", try Shipping Address
//       if (finalName === "Guest" && order.shipping_address) {
//         finalName = order.shipping_address.name || finalName;
//       }

//       // 4. If still "Guest", try Email
//       if (finalName === "Guest" && order.email) {
//         finalName = order.email;
//       }

//       // --- SAVE TO DB ---
//       await prisma.customer.create({
//         data: {
//           shopifyId: customerId,
//           name: finalName,
//           totalSpent: parseFloat(order.total_price), // Use order price for this MVP
//           tenantId: tenant.id
//         }
//       });
//     }

//     return NextResponse.json({ success: true, message: `Synced ${orders.length} orders!` });
//   } catch (error: any) {
//     console.error("Sync Error:", error.message);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { shopUrl, accessToken, email } = await req.json();

  try {
    // Ensure tenant row exists
    const tenant = await prisma.tenant.upsert({
      where: { email: email },
      update: {},
      create: { name: shopUrl, email: email }
    });

    // Fetch last 10 orders (defensive: check for orders array)
    const response = await axios.get(
      `https://${shopUrl}/admin/api/2023-10/orders.json?status=any&limit=10`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const orders = response.data?.orders ?? [];

    for (const order of orders) {
      // Save order (defensive defaults)
      const orderAmount = parseFloat(order.total_price ?? "0") || 0;
      const orderCreatedAt = order.created_at ? new Date(order.created_at) : new Date();

      // Create order row (if you have unique constraint on shopifyId, consider using upsert here too)
      await prisma.order.create({
        data: {
          shopifyId: String(order.id),
          amount: orderAmount,
          date: orderCreatedAt,
          tenantId: tenant.id
        }
      });

      // --- Customer detection & upsert logic ---

      // Use explicit customer object if present
      const customerObj = order.customer ?? null;
      const customerShopifyId = customerObj ? String(customerObj.id) : `guest_${order.id}`;

      // Helper to extract field safely
      const safe = (v: any) => (v === undefined || v === null ? '' : String(v).trim());

      // Try first/last name in order.customer, then billing_address, then shipping_address
      const firstFromCustomer = safe(customerObj?.first_name);
      const lastFromCustomer = safe(customerObj?.last_name);

      const firstFromBilling = safe(order.billing_address?.first_name);
      const lastFromBilling = safe(order.billing_address?.last_name);

      const firstFromShipping = safe(order.shipping_address?.first_name);
      const lastFromShipping = safe(order.shipping_address?.last_name);

      // Compose first/last by preference
      const firstName = firstFromCustomer || firstFromBilling || firstFromShipping || '';
      const lastName = lastFromCustomer || lastFromBilling || lastFromShipping || '';

      // Compose candidate full name
      let finalName = `${firstName} ${lastName}`.trim();

      // If still empty, try address.name fields (Shopify sometimes has combined "name")
      if (!finalName) {
        finalName =
          safe(order.billing_address?.name) ||
          safe(order.shipping_address?.name) ||
          safe(order.email) || // fallback to email
          'Guest';
      }

      // Final guard
      finalName = finalName || 'Guest';

      // Upsert customer to accumulate totalSpent across multiple orders
      // Note: this requires customer.shopifyId to be a unique field in your Prisma schema
      await prisma.customer.upsert({
        where: { shopifyId: customerShopifyId },
        update: {
          // increment totalSpent by this order's amount
          totalSpent: { increment: orderAmount },
          // update name if available
          name: finalName
        },
        create: {
          shopifyId: customerShopifyId,
          name: finalName,
          totalSpent: orderAmount,
          tenantId: tenant.id
        }
      });
    }

    return NextResponse.json({ success: true, message: `Synced ${orders.length} orders!` });
  } catch (error: any) {
    console.error("Sync Error:", error?.response?.data ?? error?.message ?? error);
    return NextResponse.json({ success: false, error: (error?.message ?? String(error)) }, { status: 500 });
  } finally {
    // Optionally disconnect in long-running environments; in serverless you'd avoid disconnect to reuse connections.
    // await prisma.$disconnect();
  }
}
