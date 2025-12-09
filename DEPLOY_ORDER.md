# Deployment Order & Configuration

## 🎯 Deploy in This Order:

1. **Supabase** (Database) - First
2. **Railway** (Backend) - Second  
3. **Vercel** (Frontend) - Third

**Why this order?**
- Backend needs database URL
- Frontend needs backend URL
- You can't configure frontend without knowing backend URL

---

## 📁 Root Directory Settings

### ✅ Railway (Backend)
**Root Directory**: `backend`

**Why**: Your FastAPI app is in `backend/app/main.py`, so Railway needs to run from the `backend/` folder.

**Configuration Steps:**
1. In Railway, go to your service
2. Click **Settings** → **Source**
3. Set **Root Directory** to: `backend`
4. Save

**Build Command** (auto-detected, but verify):
```bash
pip install -r requirements.txt && alembic upgrade head
```

**Start Command**:
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

### ✅ Vercel (Frontend)
**Root Directory**: `frontend`

**Why**: Your Next.js app is in `frontend/`, so Vercel needs to build from there.

**Configuration Steps:**
1. In Vercel, go to your project
2. Click **Settings** → **General**
3. Scroll to **Root Directory**
4. Click **Edit**
5. Set to: `frontend`
6. Save

**Build Settings** (auto-detected):
- Framework: Next.js
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)

---

## 🔧 Step-by-Step Deployment

### Step 1: Supabase (5 minutes)
1. Create project at [supabase.com](https://supabase.com)
2. Get database connection string
3. Save password

### Step 2: Railway Backend (10 minutes)

#### 2.1 Create Service
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repository: `EaseeVocab`

#### 2.2 Configure Root Directory
1. Click on the service
2. **Settings** → **Source**
3. **Root Directory**: `backend`
4. Save

#### 2.3 Set Environment Variables
Go to **Variables** tab:
```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres
JWT_SECRET=your-generated-secret-key
JWT_ALGORITHM=HS256
GOOGLE_CLIENT_ID=your-google-client-id
GEMINI_API_KEY=your-gemini-key
CORS_ORIGINS=*  # Will update after frontend deploys
```

#### 2.4 Verify Build Settings
**Settings** → **Build**:
- Build Command: `pip install -r requirements.txt && alembic upgrade head`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

#### 2.5 Deploy
- Railway will auto-deploy
- Wait for build to complete
- **Save the Railway URL**: `https://xxx.up.railway.app`

#### 2.6 Test Backend
```bash
curl https://your-app.up.railway.app/
# Should return: {"message":"EaseeVocab API running"}
```

---

### Step 3: Vercel Frontend (5 minutes)

#### 3.1 Create Project
1. Go to [vercel.com](https://vercel.com)
2. Add New → Project
3. Import repository: `EaseeVocab`

#### 3.2 Configure Root Directory
1. In project settings, find **Root Directory**
2. Click **Edit**
3. Set to: `frontend`
4. Save

#### 3.3 Set Environment Variables
**Settings** → **Environment Variables**:
```bash
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

#### 3.4 Deploy
- Click **Deploy**
- Wait for build (~2-3 minutes)
- **Save the Vercel URL**: `https://xxx.vercel.app`

---

### Step 4: Update CORS (2 minutes)

After frontend is deployed:

1. Go back to **Railway**
2. Update `CORS_ORIGINS` environment variable:
   ```bash
   CORS_ORIGINS=https://your-app.vercel.app
   ```
3. Railway will auto-redeploy

---

## ⚠️ Common Issues & Fixes

### Railway: "Module not found: app"
**Problem**: Root directory not set to `backend`
**Fix**: Set Root Directory to `backend` in Railway settings

### Railway: "alembic: command not found"
**Problem**: Migrations not running
**Fix**: Check build command includes `alembic upgrade head`

### Vercel: "Cannot find module"
**Problem**: Root directory not set to `frontend`
**Fix**: Set Root Directory to `frontend` in Vercel settings

### Vercel: Build fails with TypeScript errors
**Problem**: Old commit being used
**Fix**: Make sure Vercel is connected to correct repo (`EaseeVocab`)

### Backend can't connect to database
**Problem**: Wrong DATABASE_URL format
**Fix**: Make sure password is URL-encoded (replace special chars with % encoding)

---

## ✅ Quick Checklist

- [ ] Supabase project created
- [ ] Railway service created with root directory = `backend`
- [ ] Railway environment variables set
- [ ] Railway deployed and URL saved
- [ ] Vercel project created with root directory = `frontend`
- [ ] Vercel environment variables set (with Railway URL)
- [ ] Vercel deployed and URL saved
- [ ] CORS_ORIGINS updated in Railway
- [ ] Both services working!

---

## 📝 Summary

**Railway**: Root Directory = `backend`
**Vercel**: Root Directory = `frontend`

**Deploy Order**: Supabase → Railway → Vercel

Good luck! 🚀

