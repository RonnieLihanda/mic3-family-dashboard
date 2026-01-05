# 🚀 Deployment Guide: Vercel (Secure & Fast)

Follow these exact steps to host your **Mic3 Family Dashboard** securely on Vercel.

## 1. Prerequisites (Do this first)
Ensure you have the following ready:
-   **GitHub Account**: You need to push your code to a GitHub repository.
-   **Vercel Account**: Sign up at [vercel.com](https://vercel.com) using your GitHub account for an even easier integration.

## 2. Push Code to GitHub
If you haven't already:
1.  Create a **New Repository** on GitHub (e.g., `mic3-dashboard`).
2.  Upload all project files (including `vercel.json`, `index.html`, `app.js`, etc.) to this repository.

## 3. Deploy on Vercel
1.  Go to your **[Vercel Dashboard](https://vercel.com/dashboard)**.
2.  Click **"Add New..."** button (usually top right) -> Select **"Project"**.
3.  **Import Git Repository**:
    -   You should see your `mic3-dashboard` repo in the list. Click **"Import"**.
4.  **Configure Project** (Important):
    -   **Framework Preset**: It might say "Other" or "Vite". Just leave it or select **"Other"**.
    -   **Root Directory**: leave as `./`.
    -   **Build Command**: leave empty.
    -   **Output Directory**: leave empty.
    -   **Environment Variables**: You DO NOT need to add keys here because our app is designed to ask for keys securely in the browser (Client-Side). This keeps your keys safe effectively in your own local storage.
5.  Click **"Deploy"**.

## 4. Verify & Security Check
Once deployed (confetti on screen!):
1.  Click **"Visit"** to open your new live dashboard.
2.  **Authentication**:
    -   You will be redirected to the Login page.
    -   Click the **Gear Icon** (top right of auth page).
    -   Enter your **Supabase URL** and **Supabase Anon Key** (from your initial setup).
    -   Click "Save".
3.  **Test Login**: Log in with your email/password.

## 5. Custom Domain (Optional)
If you bought `mic3family.com` or similar:
1.  In Vercel, go to **Settings** -> **Domains**.
2.  Enter your domain name.
3.  Vercel will show you exactly what DNS records (A Record / CNAME) to add to your domain registrar (Namecheap, GoDaddy, etc.).

---

### ✅ Security Features Implemented
I have configured your `vercel.json` to automatically add "Military Grade" security headers to every response:
-   **HSTS**: Forces HTTPS connection.
-   **X-Frame-Options**: Prevents other sites from putting your dashboard in an iframe (Clickjacking protection).
-   **X-Content-Type-Options**: Prevents MIME-sniffing attacks.
-   **Permissions-Policy**: Blocks access to Camera/Microphone/etc. effectively locking down the browser features.

Your dashboard is now secure and ready for the family!
