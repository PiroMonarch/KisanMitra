# Kisanmitr - Smart Farming for India's Future

Kisanmitr is a digital bridge between farmers and consumers. It helps farmers sell produce directly to households, restaurants, hostels, and other buyers, giving consumers a more direct way to source from farmers and helping reduce reliance on middlemen. The platform also supports farmers with nearby input shopping, inventory management, and agricultural scheme guidance.

**Live Demo:** [kisan-mitra-k5bb.vercel.app](https://kisan-mitra-k5bb.vercel.app/)

## Features

- **Buy Nearby**: Find the cheapest seeds, pesticides, and tools from nearby sellers.
- **Farmer-to-Consumer Marketplace**: Help farmers connect and sell directly to households, restaurants, hostels, and other buyers, reducing middlemen in the supply chain.
- **Farm Inventory**: Track stock levels and get expiry alerts to prevent losses.
- **Loan Assistant**: Text-based help finding and applying for agricultural loans.
- **Offline Mode**: Keeps selected marketplace actions available during connectivity interruptions.

## Tech Stack

- React
- Vite
- Vanilla CSS (Premium Nature-Tech Design)
- Lucide React (Icons)

## Getting Started

1.  Clone the repository.
2.  Run `npm install` to install dependencies.
3.  Run `npm run dev` to start the development server.

## Deployment

The Vite frontend and Express/Socket.IO backend are configured as two Vercel Services in one project, sharing a domain. The app serves the frontend at `/`, routes `/api/*` to the backend, and sends `/socket.io/*` to the backend for realtime chat.

### Frontend on Vercel

1. Import `PiroMonarch/KisanMitra` from GitHub in Vercel.
2. Keep the project root as the Root Directory.
3. Use `npm run build` as the build command and `dist` as the output directory. These are also set in `vercel.json`.
4. Set `MONGO_URI`, `JWT_SECRET`, and `CRON_SECRET` in Vercel project environment variables. Vercel Cron uses `CRON_SECRET` to authorize the scheduled subscription job.
5. Deploy. The Vercel rewrite serves the React app for client-side routes such as `/auth`, `/farmer`, and `/buyer`. Production frontend requests use the same deployment origin, so no `VITE_API_URL` is needed.

### Backend and database

For local development, run the `backend` directory with `npm install` and `npm start`. Never commit `.env` files or secret values. Socket.IO connections can land on different Vercel function instances; if realtime chat must work across multiple instances, configure a shared Socket.IO adapter such as Redis.
