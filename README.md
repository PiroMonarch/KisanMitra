# Kisanmitr - Smart Farming for India's Future

Kisanmitr is a digital bridge between farmers and consumers. It helps farmers sell produce directly to households, restaurants, hostels, and other buyers, giving consumers a more direct way to source from farmers and helping reduce reliance on middlemen. The platform also supports farmers with nearby input shopping, inventory management, and agricultural scheme guidance.

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

The Vite frontend can be deployed on Vercel from this GitHub repository. The Express and Socket.IO backend must run as a separate Node.js web service because it uses persistent Socket.IO connections. Render is one option for hosting the backend.

### Frontend on Vercel

1. Import `PiroMonarch/KisanMitra` from GitHub in Vercel.
2. Keep the project root as the Root Directory.
3. Use `npm run build` as the build command and `dist` as the output directory. These are also set in `vercel.json`.
4. Add the environment variable `VITE_API_URL` with the public URL of the deployed backend, without a trailing slash.
5. Deploy. The Vercel rewrite serves the React app for client-side routes such as `/auth`, `/farmer`, and `/buyer`.

### Backend and database

Deploy the `backend` directory as a Node.js web service with `npm install` as the build command and `npm start` as the start command. Configure `MONGO_URI` and `JWT_SECRET` in the host's environment-variable settings. Set the backend's allowed CORS origins to the deployed Vercel site if you restrict CORS; never commit `.env` files or secret values.
