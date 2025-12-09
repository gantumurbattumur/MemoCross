# Fix: Supabase IPv4 Compatibility Issue

## ❌ Problem
Railway can't connect to Supabase because:
- Railway uses **IPv4-only network**
- Supabase direct connection is **not IPv4 compatible**
- Error: "Network is unreachable"

## ✅ Solution: Use Session Pooler

### Step 1: Get Session Pooler Connection String
1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Change **Method** dropdown from "Direct connection" to **"Session Pooler"**
4. Copy the connection string (will have different host/port)

### Step 2: Update Railway
1. Go to Railway service → **Variables** tab
2. Update `DATABASE_URL` with the **Session Pooler** connection string
3. Format will be something like:
   ```
   postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
   - Notice: Port is **6543** (not 5432)
   - Host is **pooler.supabase.com** (not db.xxx.supabase.co)
4. Save - Railway will auto-redeploy

### Step 3: Verify
1. Check Railway logs
2. Should see successful connection
3. Migrations should run
4. Server should start

---

## 🔍 How to Identify Session Pooler URL

**Session Pooler connection string characteristics:**
- Host: `aws-0-REGION.pooler.supabase.com` or similar
- Port: **6543** (not 5432)
- Username: `postgres.xxxxx` (with project ref)

**Direct connection (won't work on Railway):**
- Host: `db.xxxxx.supabase.co`
- Port: **5432**
- Username: `postgres`

---

## 📝 Quick Checklist

- [ ] Changed Supabase connection method to **"Session Pooler"**
- [ ] Copied Session Pooler connection string
- [ ] Replaced `[YOUR-PASSWORD]` with actual password
- [ ] URL-encoded special characters in password (if any)
- [ ] Updated `DATABASE_URL` in Railway
- [ ] Verified port is **6543** (not 5432)
- [ ] Railway redeployed successfully

---

## 🎯 Why This Works

- **Session Pooler**: IPv4 compatible, works with Railway
- **Direct Connection**: IPv6 only, doesn't work with Railway's IPv4 network

The pooler acts as a proxy that handles IPv4 connections, making it compatible with Railway.

