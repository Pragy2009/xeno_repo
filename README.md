# Xeno FDE Internship Assignment - Shopify Data Ingestion

## 1. Project Overview
This is a multi-tenant Data Ingestion Service that connects to a Shopify store, pulls live data (Orders, Customers), stores it in a PostgreSQL database, and visualizes it on a secure, interactive dashboard.

**Deployed Link:** https://xeno-eta.vercel.app/

**Demo Video:** https://www.loom.com/share/a53c6a5cbdbb4ab9b614d7d517834488

## 2. Architecture
The solution uses a unified Next.js architecture to handle the Backend API, Frontend UI, and Authentication.

**Flow:**
`[User Login] -> [Auth API] -> [Dashboard] -> [Ingest API] -> [Shopify] -> [PostgreSQL] -> [Charts]`

* **Frontend:** Next.js (React) + Tailwind CSS + Recharts + Lucide Icons (Hacker/Cyberpunk Theme).
* **Backend:** Next.js API Routes (Node.js).
* **Database:** PostgreSQL (managed by Neon.tech).
* **ORM:** Prisma (Schema & Type safety).
* **Security:** `bcrypt` for password hashing and secure credential storage.

<img width="1610" height="2015" alt="Architecture Diagram" src="https://github.com/user-attachments/assets/1d05c622-2e3d-4dba-b3f4-03f67957059a" />

## 3. Key Features & Trade-offs
* **Secure Authentication:** Unlike a simple email field, I implemented a full **Login/Signup system**. It verifies the Shopify API Token validity *before* creating an account and stores passwords securely using **bcrypt**.
* **Waterfall Logic:** To handle missing names in Shopify Test Data, the ingestion engine uses a robust waterfall logic: `Customer Profile -> Billing Address -> Shipping Address -> Email Fallback`.
* **Sync Trigger:** I used a manual sync button for this MVP to give the user control. In production, I would implement **Shopify Webhooks** (e.g., `orders/create`) for real-time updates.
* **UI/UX:** Designed a "Hacker Terminal" aesthetic with real-time system logs to reflect the "Forward Deployed Engineer" vibe.

## 4. Setup Instructions
To run this locally:

1.  Clone the repo:
    ```bash
    git clone [https://github.com/Pragy2009/xeno_repo](https://github.com/Pragy2009/xeno_repo)
    cd xeno-assignment
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    Create a `.env` file and add your Neon DB string:
    ```env
    DATABASE_URL="postgresql://..."
    ```
4.  Sync the Database Schema:
    ```bash
    npx prisma db push
    ```
5.  Run the server:
    ```bash
    npm run dev
    ```

## 5. API Documentation
### Authentication
* **POST** `/api/auth/signup`: Verifies Shopify credentials, hashes password, and creates a user.
* **POST** `/api/auth/login`: Authenticates user and returns stored Shopify credentials.

### Data Service
* **POST** `/api/ingest`: Fetches live data from Shopify using the logged-in user's token and upserts it into the DB (prevents duplicates).
* **POST** `/api/stats`: Calculates total revenue (in ₹ INR) and aggregates top customers for the dashboard.

## 6. Next Steps to Productionize
1.  **Webhooks:** Replace manual sync with Shopify Webhooks to listen for `orders/create`.
2.  **Queueing:** Use Redis/BullMQ to handle large data ingestion jobs asynchronously so the API doesn't timeout.
3.  **OAuth:** Implement official Shopify OAuth 2.0 flow for token generation instead of manual copy-pasting.
