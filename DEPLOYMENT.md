# عروض - Frontend Deployment

## Demo Mode (Standalone, No Backend)

The frontend runs in **demo mode** by default with mock data. No backend required.

```bash
# .env.development (default)
VITE_USE_DEMO=true
```

- Browse homepage, categories, products, user profiles
- Login with any email/password → demo user
- All data is mock/demo

## Production (Real Backend)

When deploying with the Laravel backend:

1. Set environment variables:
   ```
   VITE_USE_DEMO=false
   VITE_API_URL=https://api.orood.sa
   ```

2. Build:
   ```bash
   npm run build
   ```

3. Deploy the `dist/` folder to Vercel, Netlify, or any static host.

## Switching from Demo to Production

1. Update `.env.production`:
   - `VITE_USE_DEMO=false`
   - `VITE_API_URL=<your-api-url>`

2. Rebuild: `npm run build`

3. Deploy. No code changes needed.

## GitHub Push

To push the frontend to https://github.com/AbdelazizS/orood.sa:

```bash
cd D:\Brojects\orood\frontend
git init
git add .
git commit -m "Initial frontend - demo mode"
git branch -M main
git remote add origin https://github.com/AbdelazizS/orood.sa.git
git push -u origin main
```

If the repo already exists with content, you may need to pull first or force push.
