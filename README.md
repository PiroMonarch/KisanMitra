# KisanMitr

**Live demo:** [kisan-mitra-k5bb.vercel.app](https://kisan-mitra-k5bb.vercel.app/)

**GitHub:** [PiroMonarch/KisanMitra](https://github.com/PiroMonarch/KisanMitra)

KisanMitr is a marketplace prototype designed to connect farmers more directly with households, restaurants, hostels, and other buyers. Farmers can list produce, while buyers can browse listings and place orders. The goal is to make direct trade easier and help farmers reduce reliance on intermediaries.

## The Problem

Farmers may have difficulty finding buyers beyond their usual selling channels. Consumers and local businesses may also have difficulty discovering available produce directly from nearby farmers. When produce passes through several steps in the supply chain, the farmer's selling price and the consumer's final price can differ substantially.

KisanMitr focuses on improving discovery and communication between the two sides. It does not guarantee a particular price or income increase; those outcomes need to be measured with farmers and buyers in real use.

## What Works in the Prototype

- **Farmer listings:** Farmers can create and manage produce listings with price, unit, quantity, description, and optional image.
- **Buyer marketplace:** Buyers can browse listings, add products to a cart, and place orders.
- **Order-based text chat:** A buyer and farmer can communicate in chat associated with an order. This is not a general chat directory.
- **Order management:** Buyers and farmers can view orders and use the available order workflow.
- **Farmer tools:** The dashboard includes weather information and agriculture news when the backend and relevant services are available.
- **Text-based loan and scheme help:** The app includes a guided scheme and loan assistant.
- **Limited offline queue:** Some marketplace actions can be saved in browser local storage and retried when connectivity returns. It is not a fully offline app; queued changes stay on that device until they sync, and sync requires a working backend and valid account.

## Current Limitations

- Price-history charts, live mandi-rate trends, and demand analytics are not implemented.
- Seller verification badges are not currently displayed in the buyer marketplace. Reviews exist in the backend flow, but should not be presented as a complete verification system.
- Offline support covers selected cached data and queued marketplace actions only. Fresh data, chat, and other server-backed features require connectivity.
- Demo role entry is for exploring dashboards; it does not create a real authenticated backend account. Use registered accounts to test server-backed marketplace workflows.
- The Vercel backend uses serverless instances. Realtime chat across multiple instances may need a shared Socket.IO adapter such as Redis.

## Tech Stack

- **Frontend:** React, Vite, React Router, and CSS
- **Backend:** Node.js, Express, Socket.IO, and Mongoose
- **Database:** MongoDB
- **Hosting:** Vercel multi-service deployment for the frontend and backend

## Run Locally

Install dependencies from the repository root:

```powershell
npm install
npm --prefix backend install
```

Create `backend/.env` with the required local settings:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_private_random_secret
```

Keep `.env` files and secret values private. Start the frontend and backend in separate terminals:

```powershell
npm run dev
```

```powershell
npm --prefix backend run dev
```

The frontend normally opens at `http://localhost:5173`; the local API defaults to port `5001`.

## Hackathon Demo

1. Enter the Farmer demo dashboard and show how a farmer creates a produce listing.
2. Enter the Buyer demo dashboard and show how a buyer browses the marketplace.
3. Explain the order and order-based chat flow.
4. Describe the intended impact as reducing friction between farmers and buyers, not as eliminating every intermediary or guaranteeing higher income.

For testing real orders and chat, use registered farmer and buyer accounts with the backend and MongoDB configured.

## Deploy on Vercel

The root [`vercel.json`](vercel.json) defines two services in one Vercel project:

- `app` serves the Vite frontend at `/`.
- `backend` serves Express API requests under `/api/*` and Socket.IO under `/socket.io/*`.

Import this GitHub repository into Vercel and set these project environment variables:

- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: long, private signing secret
- `CRON_SECRET`: long, private secret used to authorize the scheduled subscription job

Production frontend API calls use the same deployment origin, so `VITE_API_URL` is not required. Never commit real secrets or `.env` files.