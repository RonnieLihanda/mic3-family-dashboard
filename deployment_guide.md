# Deployment Guide: Railway & Namecheap

## Part 1: Fix Database (Supabase)
You mentioned tables aren't forming. **Supabase does NOT auto-create tables** from the code. You MUST run the SQL script I provided manually once.

1.  Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2.  Select your project.
3.  Go to the **SQL Editor** (icon on the left sidebar that looks like `>_`).
4.  Click **"New Query"**.
5.  Copy and paste the entire content of the file `schema.sql` (found in your project folder).
6.  Click **Run** (bottom right of the editor).
    *   *Success Message*: It should say "Success" or "No rows returned".
    *   Now check the **Table Editor** (spreadsheet icon). You should see `budget_logs` and `profiles`.

## Part 2: Deploy to Railway
Railway is excellent for hosting this project. I have added `package.json` and `server.js` so it works out of the box.

1.  **Push Code to GitHub**:
    *   Ensure your project is in a GitHub repository.
    *   If not, create a repo and push all these files to it.

2.  **Create Railway Project**:
    *   Go to [Railway.app](https://railway.app/).
    *   Click **"New Project"** -> **"Deploy from GitHub repo"**.
    *   Select your `mic3-family-dashboard` repository.
    *   Railway will automatically detect the `package.json` and start building.

3.  **Wait for Build**:
    *   It will take 1-2 minutes. Once done, it will provide a default URL (e.g., `web-production-xxxx.up.railway.app`).
    *   Click it to verify your site is live!

## Part 2.5: Deploy to Vercel (Recommended for Speed)
Vercel is fantastic for static dashboards like this. It is often faster and free for this type of usage.

1.  **Sign Up/Login**: Go to [vercel.com](https://vercel.com).
2.  **Add New Project**:
    *   Click **"Add New"** -> **"Project"**.
    *   **Import** your GitHub repository (`mic3-family-dashboard`).
3.  **Configure**:
    *   Framework Preset: Select **"Other"** (or leave as is).
    *   Root Directory: `./`.
    *   Build Command: (Leave Empty).
    *   Output Directory: (Leave Empty).
4.  **Deploy**:
    *   Click **"Deploy"**.
    *   In 10 seconds, your site will be live!
5.  **Custom Domain**:
    *   Vercel handles domains very easily. Go to **Settings** -> **Domains** and add your Namecheap domain. It will give you simple `A` and `CNAME` records to add in Namecheap.

## Part 3: Custom Domain (Namecheap)
To use a "cheap" domain (e.g., `mic3family.xyz` or similar) from Namecheap:

1.  **Buy Domain**:
    *   Go to [Namecheap](https://www.namecheap.com/) and buy your desired domain.

2.  **Connect to Railway**:
    *   In your **Railway Project Dashboard**, click on your service card.
    *   Go to **Settings** -> **Networking** -> **Custom Domain**.
    *   Enter your domain (e.g., `www.mic3family.com`).
    *   Railway will show you a **CNAME Record** (e.g., `cname.railway.app`).

3.  **Configure Namecheap DNS**:
    *   Log in to Namecheap -> **Domain List** -> **Manage** (next to your domain).
    *   Go to **Advanced DNS**.
    *   Add a new record:
        *   **Type**: `CNAME Record`
        *   **Host**: `www`
        *   **Value**: (The value Railway gave you)
        *   **TTL**: Automatic
    *   *(Optional)* Use a URL Redirect Record for the root `@` to redirect to `www`.

4.  **Wait**: DNS changes can take up to 24-48 hours, but usually work in 30 minutes.

---
**Troubleshooting Data Saving**:
If you still see "Save Failed" errors:
1.  Open the Browser Console (F12).
2.  Look for "CRITICAL CLOUD SAVE ERROR".
3.  If it says **"permission denied"**, it means your RLS policies (from Part 1) weren't run correctly. Re-run Step 1.
