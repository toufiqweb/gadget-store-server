<div align="center">
  <img src="https://placehold.co/100x100/191a20/f26e21?text=G." alt="Gadget Store Logo" width="100" />
  
  # Gadget Store
  
  **A Next-Generation E-Commerce Experience** 🚀
  
  [![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwind-css)](https://tailwindcss.com/)
  [![Express.js](https://img.shields.io/badge/Express.js-5-lightgray?logo=express)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-7.5-47A248?logo=mongodb)](https://mongodb.com/)
  [![Better Auth](https://img.shields.io/badge/Auth-Better_Auth-blueviolet)](https://better-auth.com/)
</div>

---

## 🌐 Live Demo

- **Frontend Application:** [https://gadget-store-ta.vercel.app](https://gadget-store-ta.vercel.app)
- **Backend API:** [https://gadget-store-server-eight.vercel.app](https://gadget-store-server-eight.vercel.app)

---

## 📖 Project Overview

**Gadget Store** is a full-stack e-commerce application designed to provide a premium, dynamic, and lightning-fast shopping experience. It connects tech enthusiasts with a vast catalog of electronics ranging from laptops and drones to wearables and cameras.

The project solves the problem of clunky, slow e-commerce platforms by strictly adhering to a modular backend architecture, heavy query optimizations, and a beautifully crafted custom UI system (bypassing heavy generic component libraries). It caters to both everyday consumers seeking seamless shopping and administrators requiring powerful inventory management tools.

---

## ✨ Features

### 🔐 Authentication & Authorization
- **Secure Sessions**: Powered by Better Auth with MongoDB Adapter.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `admin` and `user` roles.
- **Protected Routes**: Secure Next.js frontend routes and Express middleware (`verifyToken`, `verifyAdmin`, `checkBlocked`).

### 🛒 Shopping Experience
- **Dynamic Product Details**: Beautiful product pages with image galleries and specifications.
- **Shopping Cart**: (Coming soon placeholder integrated into UI).
- **Responsive Navigation**: Deeply integrated desktop and mobile navigation with a quick-access drop-down.

### 🔍 Advanced Search & Filtering
*All filtering is 100% backend-controlled for optimal performance.*
- **Search**: Case-insensitive partial text matching for product names and brands.
- **Categorization**: Filter by Phones, Cameras, Drones, Wearables, Gaming, Laptops, Audio, and Tablets.
- **Multi-Brand Filtering**: Select multiple brands simultaneously.
- **Price Range**: Dynamic range sliders to cap maximum prices.
- **Stock Status**: Toggle to view "In Stock Only" items.
- **Customer Ratings**: Filter by 4-stars & up, 3-stars & up, etc.
- **Rich Sorting**: Order by Newest, Oldest, Price (Low/High), Highest Rated, and Name (A-Z, Z-A).

### 🎛️ Dashboards
- **Admin Dashboard**: Full CRUD (Create, Read, Update, Delete) management for the entire store catalog, plus User Role Management (block/unblock, promote to admin).
- **User Dashboard**: "My Products" management, profile details, and account settings.

### 🎨 Custom UI System
- **Custom Toasts**: A globally accessible, context-driven Toast notification system with custom animations (Success, Error, Info, Warning) avoiding bloated third-party libraries.
- **Dark Premium Aesthetic**: A consistent CSS-variable driven color scheme (`var(--primary)`, `var(--secondary)`, `var(--ternary)`).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS v4, Custom CSS Variables
- **Icons**: Lucide React
- **Data Visualization**: Recharts (Dashboards)

### Backend
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js 5 (Modular Architecture)
- **Language**: TypeScript

### Database & Auth
- **Database**: MongoDB (Native Driver)
- **Authentication**: Better Auth (with Mongo Adapter)

### Deployment
- **Platform**: Vercel (Both Client & Serverless API)

---

## 📁 Project Structure

```text
gadget-store/
├── client/                      # Next.js Frontend
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── app/                 # App Router (Pages & Layouts)
│   │   ├── components/          # Reusable UI (Cards, Custom Toasts)
│   │   ├── contexts/            # Global State (ToastContext)
│   │   └── lib/                 # API handlers & Auth client
│   ├── tailwind.config.ts
│   └── package.json
└── server/                      # Express Backend
    ├── api/                     # Vercel Serverless Entrypoint
    ├── src/
    │   ├── config/              # DB, CORS, & Env setups
    │   ├── db/                  # Shared MongoDB collections
    │   ├── middlewares/         # Auth & Role verification
    │   ├── modules/             # Domain-driven APIs (Admin, Product, User)
    │   ├── routes/              # Centralized route index
    │   └── app.ts               # Express App initialization
    ├── vercel.json              # Serverless deployment config
    └── package.json
```

---

## 🔌 API Overview

The backend follows a strict **Route → Controller → Service** modular pattern.

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/products` | GET | Public | Fetch products (supports filtering, sorting, pagination) |
| `/api/products/:id` | GET | Public | Fetch a single product by ID |
| `/api/products` | POST | Authenticated | Create a new product |
| `/api/products/:id` | PATCH | Owner/Admin | Update a product |
| `/api/products/:id` | DELETE | Owner/Admin | Delete a product |
| `/api/admin/users` | GET | Admin | Fetch all registered users |
| `/api/admin/users/:id/status`| PATCH | Admin | Block/Unblock users |
| `/api/admin/users/:id/role` | PATCH | Admin | Change user roles |
| `/api/user/my-products` | GET | Authenticated | Fetch products created by the user |

---

## 🔐 Environment Variables

Create a `.env` file in **both** the `client` and `server` directories before running the project.

### `server/.env`
```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?appName=Cluster0

# Allowed Origin for CORS
CLIENT_URL=http://localhost:3000
```

### `client/.env`
```env
# Authentication Secrets
BETTER_AUTH_SECRET=your_super_secret_string_here
BETTER_AUTH_URL=http://localhost:3000

# Backend API URL
NEXT_PUBLIC_BASE_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?appName=Cluster0
```

---

## 🚀 Installation & Setup

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/gadget-store.git
cd gadget-store
```

**2. Start the Backend**
```bash
cd server
npm install
npm run dev
```
*The server will start on `http://localhost:5000`.*

**3. Start the Frontend**
Open a new terminal window:
```bash
cd client
npm install
npm run dev
```
*The client will start on `http://localhost:3000`.*

---

## 📜 Available Scripts

**Client:**
- `npm run dev` - Starts Next.js development server
- `npm run build` - Compiles optimized production build
- `npm run lint` - Runs ESLint

**Server:**
- `npm run dev` - Starts Nodemon with TSX for local development
- `npm run compile` - Compiles TypeScript to JavaScript (`/dist`)
- `npm run start` - Runs the compiled Node.js build

---

## 📸 Screenshots

| Home Page | Product Filtering |
|:---:|:---:|
| <img src="https://placehold.co/600x400/191a20/ffffff?text=Home+Page" width="100%"> | <img src="https://placehold.co/600x400/191a20/ffffff?text=Backend+Filtering" width="100%"> |

| Admin Dashboard | Custom Toasts |
|:---:|:---:|
| <img src="https://placehold.co/600x400/191a20/ffffff?text=Admin+Dashboard" width="100%"> | <img src="https://placehold.co/600x400/191a20/ffffff?text=Toast+System" width="100%"> |

---

## ☁️ Deployment

Both applications are configured to deploy seamlessly to **Vercel**.

1. **Backend**: 
   - Uses `vercel.json` to rewrite `/(.*)` to `api/index.ts`.
   - Set the `MONGODB_URI` and `CLIENT_URL` in Vercel project settings.
2. **Frontend**: 
   - Deploy as a standard Next.js project on Vercel.
   - Set the `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `MONGODB_URI`, and `NEXT_PUBLIC_BASE_URL` in project settings.

---

## ⚡ Performance Optimizations

- **Server-Side Filtering**: Offloaded all complex array filtering, searching, and pagination to the MongoDB database instead of processing large datasets on the client.
- **Client-Side Debouncing**: Implemented a `500ms` debounce in `useEffect` hooks during filtering to prevent aggressive API spam.
- **Turbopack**: Utilizes Next.js Turbopack for ultra-fast local development and HMR.

---

## 🔮 Future Improvements

- Fully implement the Stripe/PayPal checkout flow (currently marked as coming soon).
- Add robust email verification and password reset flows.
- Implement Redis caching for frequently accessed product categories.
- Develop a comprehensive robust testing suite (Jest/Cypress).

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
