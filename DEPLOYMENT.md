# Deployment

## Recommended option: Render + Vercel

### Backend on Render
1. Push this repository to GitHub.
2. Create a new Web Service on Render.
3. Connect the repo and set the root directory to `backend`.
4. Use the following start command:
   `gunicorn run:app --bind 0.0.0.0:$PORT`
5. Add these environment variables:
   - `FLASK_ENV=production`
   - `SECRET_KEY=<generate-a-long-random-value>`
   - `JWT_SECRET_KEY=<generate-a-long-random-value>`
   - `CORS_ORIGINS=https://<your-frontend-domain>`
   - `DATABASE_URL=sqlite:///instance/stock.db` for a simple demo, or a PostgreSQL URL for production

### Frontend on Vercel
1. Create a new Vercel project.
2. Set the root directory to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable:
   - `VITE_API_BASE_URL=https://<your-backend-url>/api`

## Alternative: Railway or Fly.io
The same repo can also be deployed to Railway or Fly.io with a small config change.
