# Deploying NJ DMV Appointment Monitor to Vercel

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Resend Account**: Sign up at [resend.com](https://resend.com) for email notifications
3. **Vercel CLI** (optional): Install with `npm i -g vercel`

## Step 1: Set up Resend for Email Notifications

1. Go to [resend.com](https://resend.com) and create an account
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**
4. Give it a name like "DMV Monitor" and copy the key (starts with `re_`)
5. Save this key - you'll need it for Vercel

## Step 2: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. Go to [vercel.com](https://vercel.com) and click **Add New Project**
3. Import your GitHub repository
4. Configure environment variables (see Step 3)
5. Click **Deploy**

### Option B: Deploy via CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Run in your project directory:
   ```bash
   vercel
   ```

3. Follow the prompts to link/create a project
4. Configure environment variables in Vercel dashboard

## Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings** → **Environment Variables** and add:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | Your Resend API key |
| `NOTIFICATION_EMAIL` | `your-email@example.com` | Email to receive notifications |
| `VERCEL_KV_URL` | (auto-configured) | Vercel KV database URL |
| `VERCEL_KV_REST_API_URL` | (auto-configured) | Vercel KV REST API URL |
| `VERCEL_KV_REST_API_TOKEN` | (auto-configured) | Vercel KV REST API token |
| `VERCEL_KV_REST_API_READ_ONLY_TOKEN` | (auto-configured) | Vercel KV read-only token |

## Step 4: Enable Vercel KV (Redis)

1. In your Vercel project dashboard, go to **Storage**
2. Click **Create Database** → **KV**
3. Name it (e.g., "dmv-notifications")
4. Select your project region
5. Click **Create**

Vercel will automatically add the KV environment variables to your project.

## Step 5: Verify Deployment

1. Once deployed, your project will be available at: `https://your-project.vercel.app`

2. Test the manual endpoint:
   ```bash
   curl https://your-project.vercel.app/api/manual-check
   ```

3. Check the Vercel Functions logs:
   - Go to your project dashboard
   - Click **Functions** tab
   - Click on `check-dmv` to see execution logs

## Step 6: Monitor Cron Job Execution

The cron job runs every 5 minutes automatically. To monitor:

1. Go to your Vercel dashboard
2. Click **Functions** → **Cron Jobs**
3. You'll see execution history and logs

## Customizing Configuration

### Modify Search Parameters

Edit `config/monitoring-rules.json`:
- `maxDaysAhead`: How many days ahead to search (currently 10)
- `maxDatesPerLocation`: Max appointments per location (currently 10)

### Add/Remove DMV Locations

Edit `config/locations.json`:
```json
[
  { "name": "Edison", "id": 52 },
  { "name": "Rahway", "id": 60 },
  // Add more locations here
]
```

### Change Email Frequency

To change from 5 minutes to another interval, edit `vercel.json`:
```json
"schedule": "*/10 * * * *"  // Every 10 minutes
"schedule": "0 * * * *"     // Every hour
"schedule": "0 */2 * * *"   // Every 2 hours
```

## Troubleshooting

### No Emails Received

1. Check Resend dashboard for sent emails
2. Verify `NOTIFICATION_EMAIL` is correct
3. Check spam folder
4. Review Function logs in Vercel dashboard

### Cron Job Not Running

1. Ensure you're on Vercel Pro/Team plan (required for 5-minute crons)
2. Check **Functions** → **Cron Jobs** for errors
3. Verify `vercel.json` syntax is correct

### Timeout Errors

If you see timeout errors, you may need to:
1. Reduce the number of locations
2. Increase timeout in `config/monitoring-rules.json`
3. Upgrade Vercel plan for longer function execution time

## Costs

- **Vercel Free**: Limited to daily cron jobs
- **Vercel Pro ($20/month)**: Required for 5-minute cron jobs
- **Resend Free**: 100 emails/day, sufficient for monitoring
- **Vercel KV Free**: 30,000 requests/month, more than enough

## Support

For issues, check:
- Vercel Function logs
- Resend email logs
- Browser automation errors in logs