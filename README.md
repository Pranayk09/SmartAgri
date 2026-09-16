# SmartAgri ERP Control Center

SmartAgri ERP is a monolithic application designed for fertilizer manufacturing and distribution. It provides real-time tracking of manufacturing batches, credit limits, sales orders, and invoices.

## Project Structure
- `backend/`: Node.js, Express, Prisma ORM, SQLite
- `frontend/`: React, Vite, Tailwind CSS

## Prerequisites
- Node.js (v18+)

## Quick Start

### 1. Database Setup & Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed  # Populates the database with rich demo data
npm run dev
```
The backend server runs on `http://localhost:5000`.

### 2. Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend runs on `http://localhost:3000` (or the port specified by Vite).

## Demo Credentials
After running the seed script, you can log in with:
- **Email:** `owner@goldenagro.com`
- **Password:** `password123`

## Features
- **Batch Inventory & FEFO**: Track inventory and allocate stock using First-Expired-First-Out logic.
- **Customers & Credit**: Manage customers and enforce credit limits on sales.
- **Sales Orders**: Draft, confirm, and dispatch orders.
- **Invoices & Payments**: Automatically generate invoices upon dispatch and track payments.
- **Live Dashboard**: View active inventory, pending sales, credit utilization, and active distributors.
