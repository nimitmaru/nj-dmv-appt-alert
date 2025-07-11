# NJ DMV Appointment Monitor - Implementation Plan

## Project Overview
A lightweight Node.js + TypeScript monitoring system deployed on Vercel Functions that checks NJ DMV locations for weekend appointments (Transfer from out of state - Type 7) and sends email notifications via Resend when appointments become available.

## Requirements Summary
- **DMV Locations**: Edison (52), Rahway (60), Newark (56), Paterson (59)
- **Appointment Type**: Transfer from out of state (Type 7)
- **Monitoring Schedule**: Every 5 minutes via Vercel cron
- **Notifications**: Email via Resend API
- **Weekend Definition**: Saturday and Sunday (configurable)
- **Deployment**: Vercel Pro with cron jobs

## Project Structure
```
njdmvappt/
├── package.json
├── vercel.json
├── .env.local
├── config/
│   ├── locations.json        # DMV locations configuration
│   └── monitoring-rules.json # Day/time pattern configuration
├── api/
│   ├── cron/
│   │   └── check-dmv.ts     # Cron endpoint (runs every 5 min)
│   └── manual-check.ts      # Manual trigger endpoint
├── lib/
│   ├── scraper.ts           # Playwright-based scraper
│   ├── notifier.ts          # Resend email service
│   ├── date-matcher.ts      # Pattern matching for dates/times
│   ├── types.ts             # TypeScript interfaces
│   └── config.ts            # Configuration loader
├── scripts/
│   └── test-local.ts        # Local testing script
└── public/
    └── index.html           # Simple monitoring dashboard
```

## Implementation Tasks

### Phase 1: Project Setup and Core Structure

#### Task 1.1: Initialize Project
- [ ] Initialize Node.js project with Bun
- [ ] Set up TypeScript configuration
- [ ] Install core dependencies:
  - `playwright-core`
  - `@sparticuz/chromium` (for Vercel deployment)
  - `resend` (email API)
  - `date-fns` (date manipulation)
  - `@vercel/kv` (state management)
- [ ] Configure TypeScript with strict mode
- [ ] Set up `.gitignore` and `.env.local.example`

#### Task 1.2: Create Project Structure
- [ ] Create all directory structure as outlined above
- [ ] Create `types.ts` with interfaces:
  ```typescript
  interface DMVLocation {
    name: string;
    id: number;
  }
  
  interface Appointment {
    location: string;
    locationId: number;
    date: string;
    dayOfWeek: string;
    times: string[];
    url: string;
  }
  
  interface MonitoringRule {
    name: string;
    enabled: boolean;
    days: string[];
    timeRanges: string[];
  }
  ```

#### Task 1.3: Configuration Files
- [ ] Create `config/locations.json`:
  ```json
  [
    { "name": "Edison", "id": 52 },
    { "name": "Rahway", "id": 60 },
    { "name": "Newark", "id": 56 },
    { "name": "Paterson", "id": 59 }
  ]
  ```
- [ ] Create `config/monitoring-rules.json` with flexible pattern system
- [ ] Create `lib/config.ts` to load and validate configurations

### Phase 2: Browser Automation and Scraping

#### Task 2.1: Playwright Setup
- [ ] Create `lib/browser.ts` with optimized Vercel configuration
- [ ] Implement browser instance management
- [ ] Add proper error handling and cleanup
- [ ] Configure for both local development and Vercel deployment

#### Task 2.2: DMV Site Scraper
- [ ] Create `lib/scraper.ts` with main `DMVChecker` class
- [ ] Implement navigation to appointment wizard (Type 7)
- [ ] Handle location selection and navigation
- [ ] Parse calendar UI to find available dates
- [ ] Extract time slots for each available date
- [ ] Handle edge cases (no appointments, loading errors)

#### Task 2.3: Date Pattern Matching
- [ ] Create `lib/date-matcher.ts` for flexible date/time matching
- [ ] Implement weekend detection (Saturday/Sunday)
- [ ] Support time range matching (morning, afternoon, specific times)
- [ ] Allow custom patterns via configuration
- [ ] Add preset support for common patterns

### Phase 3: Notification System

#### Task 3.1: Resend Email Integration
- [ ] Create `lib/notifier.ts` with Resend integration
- [ ] Design HTML email template with:
  - Clear appointment details
  - Direct booking links
  - Available time slots
  - Location information
- [ ] Implement plain text fallback
- [ ] Add error handling and retry logic

#### Task 3.2: Duplicate Prevention
- [ ] Integrate Vercel KV for state management
- [ ] Track sent notifications by appointment key
- [ ] Implement 24-hour cache for notifications
- [ ] Add logic to prevent duplicate emails

### Phase 4: API Endpoints

#### Task 4.1: Cron Endpoint
- [ ] Create `api/cron/check-dmv.ts`
- [ ] Implement CRON_SECRET authentication
- [ ] Run full check across all locations
- [ ] Filter results based on monitoring rules
- [ ] Send notifications for new appointments
- [ ] Log results to Vercel KV

#### Task 4.2: Manual Check Endpoint
- [ ] Create `api/manual-check.ts`
- [ ] Add API key authentication
- [ ] Return current appointment availability
- [ ] Support location filtering via query params
- [ ] Add rate limiting

### Phase 5: Monitoring Dashboard

#### Task 5.1: Simple Web UI
- [ ] Create `public/index.html` with Tailwind CSS
- [ ] Display last check timestamp
- [ ] Show current appointment availability
- [ ] Add manual check button
- [ ] Display recent notification history

#### Task 5.2: Status Monitoring
- [ ] Add health check endpoint
- [ ] Track success/failure rates
- [ ] Display error logs
- [ ] Show cron job execution history

### Phase 6: Deployment and Testing

#### Task 6.1: Vercel Configuration
- [ ] Create `vercel.json` with:
  - Cron job schedule (*/5 * * * *)
  - Function timeout settings (60 seconds)
  - Environment variable schema
- [ ] Configure build settings
- [ ] Set up preview deployments

#### Task 6.2: Environment Setup
- [ ] Document all required environment variables:
  - `RESEND_API_KEY`
  - `NOTIFICATION_EMAIL`
  - `CRON_SECRET` (auto-generated)
  - `API_KEY` (for manual checks)
  - KV store variables (auto-configured)
- [ ] Create setup documentation

#### Task 6.3: Testing
- [ ] Create `scripts/test-local.ts` for local testing
- [ ] Test each DMV location individually
- [ ] Verify email notifications
- [ ] Test cron job execution
- [ ] Validate error handling
- [ ] Load test with multiple locations

### Phase 7: Documentation and Optimization

#### Task 7.1: Documentation
- [ ] Create comprehensive README.md
- [ ] Document configuration options
- [ ] Add troubleshooting guide
- [ ] Include example notifications

#### Task 7.2: Performance Optimization
- [ ] Optimize Playwright bundle size
- [ ] Implement parallel location checking
- [ ] Add request caching where appropriate
- [ ] Monitor and optimize Vercel function duration

## Configuration Examples

### Monitoring Rules Configuration
```json
{
  "rules": [
    {
      "name": "Weekend Appointments",
      "enabled": true,
      "days": ["Saturday", "Sunday"],
      "timeRanges": ["all"]
    },
    {
      "name": "Friday Late Afternoon",
      "enabled": false,
      "days": ["Friday"],
      "timeRanges": ["15:00-18:00"]
    },
    {
      "name": "Weekday Mornings",
      "enabled": false,
      "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "timeRanges": ["morning"]
    }
  ],
  "presets": {
    "morning": "08:00-12:00",
    "afternoon": "12:00-17:00",
    "evening": "17:00-20:00",
    "business_hours": "09:00-17:00"
  }
}
```

## Success Criteria
1. System successfully checks all 4 DMV locations every 5 minutes
2. Email notifications sent when weekend appointments are found
3. No duplicate notifications for the same appointment
4. Dashboard shows current system status
5. Manual checks can be triggered via API
6. System handles errors gracefully without crashing

## Timeline Estimate
- **Day 1**: Complete Phase 1-2 (Setup and Core Scraping)
- **Day 2**: Complete Phase 3-4 (Notifications and API)
- **Day 3**: Complete Phase 5-7 (Dashboard, Deploy, and Test)

## Notes
- This is a hackathon-style project, focusing on functionality over production scalability
- The DMV site may have anti-bot measures; we'll handle gracefully
- Email notifications via Resend provide professional delivery
- Vercel KV provides simple state management without external database