# NJ DMV Appointment Monitor

A lightweight Node.js + TypeScript monitoring system that checks NJ DMV locations for weekend appointments and sends email notifications when slots become available.

## Features

- 🔍 Monitors multiple NJ DMV locations for appointment availability
- 📅 Configurable day/time patterns (default: weekends only)
- 📧 Email notifications via Resend when appointments are found
- ⏰ Automated checking every 5 minutes via Vercel cron jobs
- 🚫 Duplicate notification prevention (24-hour cache)
- 📊 Simple web dashboard for manual checks
- 🔒 API key authentication for manual endpoints

## Configuration

### DMV Locations

Edit `config/locations.json` to add or remove DMV locations:

```json
[
  { "name": "Edison", "id": 52 },
  { "name": "Rahway", "id": 60 },
  { "name": "Newark", "id": 56 },
  { "name": "Paterson", "id": 59 }
]
```

### Monitoring Rules

Edit `config/monitoring-rules.json` to customize when to look for appointments:

```json
{
  "searchConfig": {
    "maxWeeksAhead": 3,          // Maximum weeks to look ahead
    "maxDatesPerLocation": 10,   // Max dates to find per location
    "monthsToCheck": 2           // How many months to browse in calendar
  },
  "rules": [
    {
      "name": "Next 3 Weekends",
      "enabled": true,
      "days": ["Saturday", "Sunday"],
      "timeRanges": ["all"],
      "dateRange": {
        "type": "relative",
        "value": "next-3-weekends"
      }
    }
  ]
}
```

#### Date Range Options

1. **Relative Ranges:**
   - `"type": "relative", "value": "next-3-weekends"` - Next 3 weekends only
   - `"type": "relative", "value": "next-month"` - All dates in next month

2. **Days Ahead:**
   - `"type": "days-ahead", "value": 30` - Next 30 days

3. **Absolute Range:**
   - `"type": "absolute", "start": "2025-08-01", "end": "2025-08-15"` - Specific date range

## Local Development

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Install Playwright browsers (for local testing):**
   ```bash
   bunx playwright install chromium
   ```

4. **Run local test:**
   ```bash
   bun run scripts/test-local.ts
   ```

## Deployment to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard:**
   - `RESEND_API_KEY` - Your Resend API key
   - `NOTIFICATION_EMAIL` - Email to receive notifications
   - `API_KEY` - (Optional) API key for manual check endpoint
   - `CRON_SECRET` - (Auto-generated) Vercel cron authentication

4. **Verify deployment:**
   - Visit your deployment URL to see the dashboard
   - Check Vercel logs for cron execution

## API Endpoints

### Manual Check
```
GET /api/manual-check
GET /api/manual-check?location=52
```

Headers:
- `x-api-key`: Your API key (if configured)

### Cron Endpoint (Vercel internal)
```
GET /api/cron/check-dmv
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend API key for sending emails | Yes |
| `NOTIFICATION_EMAIL` | Email address to receive notifications | Yes |
| `API_KEY` | API key for manual check endpoint | No |
| `CRON_SECRET` | Vercel cron authentication (auto-set) | Yes (auto) |
| `DMV_LOCATIONS` | Override location config (JSON string) | No |
| `MONITORING_RULES` | Override monitoring rules (JSON string) | No |

## Architecture

- **Scraper**: Uses Playwright to navigate DMV site and extract appointment data
- **Date Matcher**: Flexible pattern matching for days/times
- **Notifier**: Sends HTML emails via Resend API
- **State Management**: Vercel KV for caching sent notifications
- **Deployment**: Vercel Functions with cron scheduling

## Troubleshooting

1. **No appointments found:**
   - Check if the DMV site structure has changed
   - Verify locations are correct in config
   - Run local test with `TEST_SINGLE_LOCATION = true`

2. **Email not sending:**
   - Verify `RESEND_API_KEY` is correct
   - Check Resend dashboard for API logs
   - Test with `TEST_SEND_EMAIL = true` in local script

3. **Cron not running:**
   - Check Vercel dashboard for cron logs
   - Verify `CRON_SECRET` is set
   - Ensure you have Vercel Pro for cron jobs

## Notes

- This is a hackathon-style project focused on functionality
- The DMV site may have anti-bot measures; the scraper handles errors gracefully
- Appointment availability changes rapidly - act fast when notified!
