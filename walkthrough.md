# Walkthrough - Full-Stack Migration to Node.js/Express Backend

We have successfully migrated the Joy Thai Shop application from a client-side Supabase connection to a robust, secure Node.js/Express backend. This resolves database connection issues, handles table schema initialization, and provides REST API endpoints to manage products, orders, profiles, and admin accounts.

## Changes Made

### 1. Full-Stack Express Server Setup
- Created [package.json](file:///c:/Users/Ford%20&%20Miru/Desktop/Shop/package.json) to declare core dependencies:
  - `express`: REST API routing and serving static files.
  - `pg`: Connection pooling for PostgreSQL (Supabase database).
  - `cors`: Handles Cross-Origin Resource Sharing.
  - `dotenv`: Loads local environment variables from `.env`.
- Implemented [server.js](file:///c:/Users/Ford%20&%20Miru/Desktop/Shop/server.js):
  - Serves static assets (`index.html`, `script.js`, `style.css`, etc.) directly from the root.
  - Configures PostgreSQL connection pooling (`pg.Pool`) with SSL rejection bypass for external cloud database connections.
  - Runs automatic table initialization (`initDatabase()`) on startup. Checks and creates tables (`products`, `orders`, `order_items`, `profiles`, `admins`) if they do not exist.
  - Auto-seeds a default admin account (username: `admin` / password: `admin123`) and the 12 default shop products when the `products` table is empty.
  - Handles database connection errors gracefully during startup without crashing the Express server.

### 2. Express Backend API Routes
Created robust API endpoints under `/api`:
- **Products**:
  - `GET /api/products`: Fetches all products.
  - `POST /api/products/upsert`: Bulk synchronizes active products (used by the backoffice editor).
- **Orders**:
  - `GET /api/orders`: Retrieves all orders aggregated with their corresponding nested items array.
  - `POST /api/orders`: Places orders and handles atomic insertions for the order header and item detail records.
  - `PUT /api/orders/:id`: Updates order status or tracking numbers.
  - `DELETE /api/orders/:id`: Removes orders from the system.
- **Profiles (User Accounts)**:
  - `POST /api/profiles/check`: Verifies if a username exists (case-insensitive).
  - `POST /api/profiles`: Registers new customer profiles.
- **Admins**:
  - `POST /api/admins/login`: Validates admin login credentials.
  - `GET /api/admins`: Lists admin accounts.
  - `POST /api/admins`: Creates new admin credentials.
  - `DELETE /api/admins/:username`: Deletes admin users.

### 3. Frontend Refactoring
- **Removed CDN SDK Import**: Edited [index.html](file:///c:/Users/Ford%20&%20Miru/Desktop/Shop/index.html) to delete the client-side Supabase JavaScript SDK tag, reducing bundle size and load time.
- **Relative Path Configuration**: Rewrote [supabase-config.js](file:///c:/Users/Ford%20&%20Miru/Desktop/Shop/supabase-config.js) to export a relative API base path (`/api`), allowing the app to run seamlessly in local dev (`localhost:10000`) and on Render.com on the same origin.
- **Refactored script.js**: Replaced direct client-side Supabase database calls (`supabaseClient.from(...)`) with standard asynchronous `fetch()` API calls to relative paths. This includes:
  - `loadProductsFromDB()`, `seedDefaultProducts()`, `saveProductsToDB()`
  - `loadOrdersFromDB()`, `saveOrderToDB()`, `updateOrderInDB()`, `deleteOrderFromDB()`
  - User registration & login blocks inside `handleAuthSubmit()`
  - Admin operations: `loginAdmin()`, `registerAdmin()`, `loadAdminList()`, and `deleteAdminUser()`

### 4. Local Configuration Template
- Created [`.env`](file:///c:/Users/Ford%20&%20Miru/Desktop/Shop/.env) to store the `DATABASE_URL` connection string and server `PORT` variable.

---

## How to Run & Verify

1. **Install Dependencies**:
   ```bash
   npm.cmd install
   ```
2. **Update Environment Variables**:
   Open [`.env`](file:///c:/Users/Ford%20&%20Miru/Desktop/Shop/.env) and replace `[your-supabase-db-password]` with your actual Supabase database password.
3. **Start the Server**:
   ```bash
   node server.js
   ```
4. **Access the Application**:
   Open [http://localhost:10000](http://localhost:10000) in your web browser. Try registering an account, logging in, ordering products, and accessing the Backoffice dashboard (`admin` / `admin123`) to verify operations.
