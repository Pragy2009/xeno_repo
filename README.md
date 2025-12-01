# Xeno FDE Internship Assignment - Shopify Data Ingestion

## 1. Project Overview
This is a multi-tenant Data Ingestion Service that connects to a Shopify store, pulls live data (Orders, Customers), stores it in a PostgreSQL database, and visualizes it on a dashboard.

**Deployed Link:** https://xeno-eta.vercel.app/
**Demo Video:** [PASTE_YOUR_LOOM_VIDEO_LINK_HERE]

## 2. Architecture
The solution uses a unified Next.js architecture to handle both the Backend API and Frontend UI.

**Flow:**
`[Shopify Store] -> (API Sync) -> [Next.js Backend] -> [PostgreSQL (Neon)] -> [Dashboard UI]`

* **Frontend:** Next.js (React) + Tailwind CSS + Recharts
* **Backend:** Next.js API Routes (Node.js)
* **Database:** PostgreSQL (managed by Neon.tech)
* **ORM:** Prisma (Schema & Type safety)



[Image of Architecture Diagram]
 *(See section below for the image)*

## 3. Assumptions & Trade-offs
* **Sync Trigger:** I assumed a manual sync (via button click) is sufficient for this MVP. In a production environment, I would use **Shopify Webhooks** (e.g., `orders/create`) to update the database in real-time.
* **Authentication:** I used a simple "Email" identifier to simulate multi-tenancy. In production, I would implement OAuth 2.0 or JWT-based authentication.
* **Data Limits:** The chart currently visualizes the top 5 customers and total revenue based on the data currently ingested in the DB.

## 4. Setup Instructions
To run this locally:

1.  Clone the repo:
    ```bash
    git clone (https://github.com/Pragy2009/xeno_repo)
    cd xeno-assignment
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    Create a `.env` file and add your Neon DB string:
    ```
    DATABASE_URL="postgresql://..."
    ```
4.  Run the server:
    ```bash
    npm run dev
    ```

## 5. API Documentation
* **POST** `/api/ingest`: Fetches data from Shopify and upserts into DB.
    * *Body:* `{ shopUrl, accessToken, email }`
* **POST** `/api/stats`: Calculates total revenue and top customers for the dashboard.
    * *Body:* `{ email }`

## 6. Next Steps to Productionize
1.  **Webhooks:** Replace manual sync with Shopify Webhooks to listen for `orders/create`.
2.  **Queueing:** Use Redis/BullMQ to handle large data ingestion jobs asynchronously so the API doesn't timeout.
3.  **Security:** Implement Shopify OAuth for secure token management.
