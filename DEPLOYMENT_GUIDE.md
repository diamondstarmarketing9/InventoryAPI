# Deploying Inventory API to Hostinger VPS

This guide assumes you have a clean **Ubuntu 20.04/22.04** or **Debian** VPS from Hostinger and root access (via SSH).

## 1. Connect to VPS
Open your terminal (PowerShell or CMD on Windows) and SSH into your server:
```bash
ssh root@<YOUR_VPS_IP>
```
*Enter your root password when prompted.*

---

## 2. Install Node.js (v18 or v20)
Run these commands to install Node.js:
```bash
# Update system packages
apt update && apt upgrade -y

# Install tools
apt install -y curl git unzi

# Add NodeSource repo (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js
apt install -y nodejs

# Verify install
node -v
npm -v
```

---

## 3. Install & Configure PostgreSQL
```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start the service
systemctl start postgresql
systemctl enable postgresql

# Switch to the postgres user
su - postgres

# Enter the PostgreSQL shell
psql
```
q
### Inside the PostgreSQL Shell (`postgres=#`):
Run the following SQL commands (change `YourSecurePass` to a real strong password):

```sql
-- 1. Create Database
CREATE DATABASE inventory_db;

-- 2. Create User
CREATE USER inventory_user WITH PASSWORD 'YourSecurePass';

-- 3. Grant Permissions
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;

-- 4. Exit
\q
```

Type `exit` to return to the root user:
```bash
exit
```

---

## 4. Upload Your Code

### Option A: Using Git (Recommended)
1. Push your code to GitHub/GitLab.
2. Clone it on the server:
```bash
cd /var/www
git clone https://github.com/yourusername/inventory-api.git
cd inventory-api
```

### Option B: Using SFTP (FileZilla / WinSCP)
1. Use FileZilla to connect to your VPS IP (`sftp://<YOUR_IP>`) with user `root`.
2. Navigate to `/var/www/`.
3. Create a folder `inventory-api`.
4. Upload all files from your local `g:\InventoryAPI` **EXCEPT** `node_modules`.

---

## 5. Setup Project on VPS

```bash
# Go to project directory
cd /var/www/inventory-api

# Install dependencies
npm install

# Create production .env file
nano .env
```
Paste your production configuration inside `nano`. **Crucially, allow remote connection if needed, but local usage is safer.**

```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=inventory_user
DB_PASS=YourSecurePass
DB_NAME=inventory_db
DB_PORT=5432
JWT_SECRET=YourSuperSecur3LongKeyFromProduction
```
*Press `Ctrl+X`, then `Y`, then `Enter` to save.*

---

## 6. Run with PM2 (Process Manager)
PM2 acts as a supervisor. If your app crashes or the server restarts, PM2 brings it back up.

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start server.js --name "inventory-api"

# Save the process list so it restarts on boot
pm2 save
pm2 startup
```
*(Run the command outputted by `pm2 startup` if asked)*.

---

## 7. Setup Nginx (Reverse Proxy) - Optional but Recommended
Right now your app is on port 3000. It's better to access it via port 80 (HTTP) or your domain.

```bash
# Install Nginx
apt install -y nginx

# Create config
nano /etc/nginx/sites-available/inventory
```

Paste this content:
```nginx
server {
    listen 80;
    server_name your_domain_or_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:
```bash
ln -s /etc/nginx/sites-available/inventory /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

## 8. Done!
Your API is now live at: `http://<YOUR_VPS_IP>/api/products`
