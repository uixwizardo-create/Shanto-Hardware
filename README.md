# Shanto Hardware Inventory & Sales Management System

A modern, fast, and secure internal inventory tracking and retail sales management application built for **Shanto Hardware**. The application is designed to streamline paint color tracking, automate stock replenishment warnings, and log counter sales in a fast-paced retail environment.

---

## 🌟 Key Features

- **Dual-Language Interface (Bilingual English & Bengali)**: Seamless one-click translation toggle for all screens, catering to local shop owners and counter staff in Bangladesh.
- **Dynamic Dashboard & Reports**: Interactive analytics dashboard containing charts for daily revenue timelines, top-selling paint colors by value, and paint size volume distribution.
- **Intelligent Paint Color Management**: Pre-loaded database containing 15 popular paint colors across 4 specific packaging sizes:
  - **Gallon** (৳45.00)
  - **2 Pound (.91L)** (৳25.00)
  - **Half Liter (4.55)** (৳15.00)
  - **Half Pound (200ML)** (৳8.00)
- **Advanced Stock Level Control**: Real-time warnings when items fall below their minimum safety stock threshold (5 units).
- **Atomic Stock Checks (No-Negative-Stock)**: Database-enforced triggers prevent warehouse staff from checking out more stock than is physically available in the inventory.
- **Zero-Config Demo Mode**: Fallback to browser-based local storage database and authentication when Supabase keys are not present. Perfect for quick previews or local sandbox testing.

---

## 🛠️ Technologies Used

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, optimized React Server Components)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database / Backend**: [Supabase](https://supabase.com/) (PostgreSQL database, Row Level Security, Custom SQL Views, Database Triggers, and Authentication)
- **Data Visualizations**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

---

## 🚀 Quickstart: Running in Demo Mode (Local-First)

If the application is launched without Supabase credentials, it automatically defaults to **Demo Mode**. All database records, user authentication sessions, and log histories are stored dynamically within the browser's `localStorage`.

### 🔑 Demo Credentials

The application seeds two roles automatically on launch:

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@shantohardware.com` | `admin123` | Full access, including adding/editing products and reviewing sales charts. |
| **Staff** | `staff@shantohardware.com` | `staff123` | Product search, history logs, recording stock-in, and recording sales (stock-out). |

---

## ⚡ Setup Guide for Supabase Integration

To connect the application to a cloud-hosted production PostgreSQL database, follow these steps:

### 1. Create a Supabase Project
Sign up or log in to [Supabase](https://supabase.com) and create a new project.

### 2. Set Up the Database Schema
Open the **SQL Editor** in your Supabase project dashboard, create a new query tab, copy the contents of the database schema script from [schema.sql](file:///e:/Anti%20Gravity%20Project/Shanto%20Hardware/schema.sql) (located at `./schema.sql`), and execute it. 

The schema script will build the following structure:
- **Profiles Table (`profiles`)**: Connects Supabase Auth user IDs to their custom system profiles, tracking user `email`, `name`, and system `role` (`admin` or `staff`).
- **Inventory Items Table (`inventory_items`)**: Tracks paint products, including serial numbers, bilingual names (`color_name_en`, `color_name_bn`), consolidated full names (`full_color_name`), packaging size constraints, initial base stock (`initial_stock`), minimum safety stock threshold (`minimum_stock`), and custom items notes.
- **Stock Transactions Table (`stock_transactions`)**: Chronological audit log of stock movements mapping transaction action types (`STOCK_IN`, `STOCK_OUT`, or `ADJUSTMENT`) and change quantities. It automatically captures historical stock snapshots by saving the `previous_stock` and `new_stock` levels directly to the transaction record.
- **Current Stock View (`inventory_current_stock_view`)**: Replaces the basic stock calculations by aggregating total additions (`total_stock_in`), total subtractions (`total_stock_out`), and adjustment offsets (`total_adjustments`) alongside `initial_stock` to dynamically calculate `current_stock` levels and project the item's safety status (`Out of Stock`, `Reorder`, or `Available`).
- **Trigger Functions**:
  - **Stock Guard (`enforce_no_negative_stock`)**: Executed BEFORE INSERT on `stock_transactions`, this trigger validates that any incoming transaction will not result in a negative stock level. It also automatically calculates and populates the `previous_stock` and `new_stock` fields to snapshot changes.
  - **Timestamp Auto-Updater (`update_updated_at_column`)**: Executed BEFORE UPDATE on `inventory_items` to automatically keep the `updated_at` column in sync.
- **Seed Data**: Populates initial default credentials and 60 inventory items (15 colors × 4 sizes).

### 3. Enable Email Authentication
In the Supabase Dashboard, navigate to **Authentication** > **Providers** > **Email** and ensure that Email Sign-In is enabled. (You can turn off "Confirm email" for simplified registration).

### 4. Create Users
Create users under the **Authentication** > **Users** panel using the seeded emails, or register brand new users directly. The app implements a **dynamic fallback profile creator**: if a user logs in and does not have a database profile in the `profiles` table, one will be created automatically, assigning the `admin` role if their email contains `"admin"` and `staff` otherwise.

### 5. Configure Environment Variables
Create a `.env` or `.env.local` file at the root of the project and populate it with your project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(You can use the template file [env.example](file:///e:/Anti%20Gravity%20Project/Shanto%20Hardware/.env.example) as a reference)*

---

## 💻 Local Development & Build Command Reference

Ensure you have [Node.js](https://nodejs.org/) installed (LTS version recommended).

### Install Dependencies
```bash
npm install
```

### Start Development Server (Hot Reloading)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Run Code Linter
```bash
npm run lint
```

### Compile Production Build
```bash
npm run build
```

### Preview Production Build Locally
```bash
npm run start
```

---

## ☁️ Vercel Deployment Guide

To deploy the Shanto Hardware app to Vercel:

1. **Push your code** to a git repository (GitHub, GitLab, or Bitbucket).
2. **Log into Vercel** and select **Add New** > **Project**.
3. Import your project repository.
4. **Configure Environment Variables**:
   - In the "Environment Variables" section, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - If you want the live deployment to run in **Demo Mode** for stakeholder previews, simply omit these variables.
5. Click **Deploy**. Vercel will build the project and output a live public URL.
