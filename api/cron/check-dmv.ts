import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { DMVChecker } from '../../lib/scraper';
import { Notifier } from '../../lib/notifier';
import { getDMVLocations } from '../../lib/config';
import type { CheckResult, NotificationRecord } from '../../lib/types';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Verify cron secret (Vercel adds this automatically)
  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('Unauthorized cron attempt');
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  const result: CheckResult = {
    success: false,
    appointments: [],
    timestamp: new Date(),
    locationsChecked: 0
  };

  try {
    console.log('Starting DMV appointment check...');
    
    const locations = getDMVLocations();
    result.locationsChecked = locations.length;
    
    const checker = new DMVChecker(locations);
    const appointments = await checker.checkAllLocations();
    result.appointments = appointments;
    
    if (appointments.length > 0) {
      console.log(`Found ${appointments.length} appointments, checking notification history...`);
      
      // Generate a unique key for these appointments
      const appointmentKey = appointments
        .map(a => `${a.locationId}-${a.date}`)
        .sort()
        .join('|');
      
      // Check if we've already notified about these exact appointments
      const notificationKey = `notification:${appointmentKey}`;
      const existingNotification = await kv.get<NotificationRecord>(notificationKey);
      
      if (!existingNotification) {
        console.log('New appointments found, sending notification...');
        
        try {
          const notifier = new Notifier();
          await notifier.sendNotification(appointments);
          
          // Record that we've sent this notification
          const notificationRecord: NotificationRecord = {
            appointmentKey,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          };
          
          await kv.set(notificationKey, notificationRecord, {
            ex: 86400 // 24 hours in seconds
          });
          
          console.log('Notification sent successfully');
        } catch (error) {
          console.error('Failed to send notification:', error);
          result.error = 'Failed to send notification';
        }
      } else {
        console.log('Already notified about these appointments within the last 24 hours');
      }
      
      // Store latest results for dashboard
      await kv.set('latest-check', result, {
        ex: 3600 // 1 hour
      });
    } else {
      console.log('No appointments found matching criteria');
    }
    
    // Log the check
    await kv.lpush('check-history', {
      timestamp: result.timestamp,
      appointmentsFound: appointments.length,
      locationsChecked: result.locationsChecked,
      duration: Date.now() - startTime
    });
    
    // Keep only last 100 entries
    await kv.ltrim('check-history', 0, 99);
    
    result.success = true;
    
    return response.status(200).json(result);
  } catch (error) {
    console.error('Cron job failed:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    
    // Log error
    await kv.lpush('check-errors', {
      timestamp: new Date(),
      error: result.error,
      duration: Date.now() - startTime
    });
    
    // Keep only last 50 errors
    await kv.ltrim('check-errors', 0, 49);
    
    return response.status(500).json(result);
  }
}