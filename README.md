# Gadget Store — Backend API ⚙️

Welcome to the backend server for the **Gadget Store** application. This project is a robust, modular REST API built with **Express.js**, **Node.js**, and **TypeScript**, connected to a **MongoDB** database.

It is responsible for handling all core business logic, including complex product filtering, user management, and secure authentication (handled via Better Auth).

## ✨ Key Features

- **Modular Architecture**: Code is strictly organized into domains (e.g., `product`, `admin`, `user`), each containing its own Route, Controller, and Service layer for maximum scalability.
- **Advanced Query Engine**: Supports deep, native MongoDB querying directly from URL parameters (e.g., regex search, price ranges, brand arrays, sorting, pagination, and stock checks).
- **Role-Based Access Control (RBAC)**: Custom middlewares enforce secure access to endpoints (e.g., `verifyAdmin` ensures only administrators can modify product listings or block users).
- **Serverless Ready**: Configured perfectly to deploy as a Serverless Function on Vercel via `api/index.ts`.
- **TypeScript Safety**: Fully typed requests, responses, and database interactions.

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have **Node.js (v20+)** installed on your machine.

### 2. Installation
Navigate into the `server` directory and install the required dependencies:
```bash
cd server
npm install
```

### 3. Environment Variables
Create a `.env` file in the root of the `server` directory. The application requires these variables to run correctly:
```env
# MongoDB Connection String (Required)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?appName=Cluster0

# Allowed Origin for CORS Security (Required)
CLIENT_URL=http://localhost:3000
```

### 4. Running the Development Server
Start the local API using Nodemon and TSX (auto-reloads on file changes):
```bash
npm run dev
```
The server will boot up and listen on port `5000` by default.

## 📁 Folder Structure

```text
server/
├── api/                  # Vercel entry point for serverless deployment
├── src/
│   ├── config/           # Database connection, CORS, and Express setup
│   ├── db/               # Shared MongoDB collections (products, users)
│   ├── middlewares/      # Security layers (Auth, Admin, Block checks)
│   ├── modules/          # Core Business Logic
│   │   ├── admin/        # Admin routes & controllers (user management)
│   │   ├── product/      # Product routes, filtering engine & CRUD
│   │   └── user/         # User specific routes (My Products, Profile)
│   ├── routes/           # Central index combining all modular routes
│   ├── app.ts            # Express application initialization
│   └── server.ts         # Local server startup file
├── .env                  # Environment secrets (ignored by Git)
├── tsconfig.json         # TypeScript compiler configuration
├── vercel.json           # Vercel deployment configuration
└── package.json
```

## 🔌 API Documentation

All routes are prefixed with `/api`. Here is an overview of the primary endpoints:

### Product Management
- `GET /api/products` — Retrieve products with optional query filtering (`search`, `category`, `brands`, `minPrice`, `maxPrice`, `rating`, `inStock`, `sort`, `page`).
- `GET /api/products/:id` — Retrieve a single product by its MongoDB ObjectId.
- `POST /api/products` — Create a new product *(Requires Authentication)*.
- `PATCH /api/products/:id` — Update an existing product *(Requires Admin or Ownership)*.
- `DELETE /api/products/:id` — Delete a product *(Requires Admin or Ownership)*.

### Administrative Actions
- `GET /api/admin/users` — Get all users *(Requires Admin)*.
- `PATCH /api/admin/users/:id/status` — Block or unblock a user *(Requires Admin)*.
- `PATCH /api/admin/users/:id/role` — Promote or demote user roles *(Requires Admin)*.

### User Specific
- `GET /api/user/my-products` — Retrieve all products created by the currently authenticated user *(Requires Authentication)*.

## 🛠️ Scripts

- `npm run dev` — Starts the development server with live-reloading (`nodemon` + `tsx`).
- `npm run compile` — Compiles the TypeScript source code into standard JavaScript in the `/dist` folder.
- `npm run start` — Runs the compiled production server (`node dist/src/server.js`).

## ☁️ Deployment

This backend is designed to run on **Vercel** as a serverless function. 
The `vercel.json` file automatically intercepts all traffic (`/(.*)`) and routes it through the Express application located in `api/index.ts`. 

To deploy, simply link this folder to a Vercel project, set your `MONGODB_URI` and `CLIENT_URL` in the Vercel dashboard, and deploy.

---
*Developed with ❤️ for the Gadget Store Backend.*
