import { withPage } from './browser';
import { isDateMatchingRules, formatAppointmentDate } from './date-matcher';
import { getMonitoringConfig } from './config';
import type { DMVLocation, Appointment } from './types';

export class DMVChecker {
  private baseUrl = 'https://telegov.njportal.com/njmvc/AppointmentWizard/7';
  private monitoringConfig = getMonitoringConfig();

  constructor(private locations: DMVLocation[]) {}

  async checkAllLocations(): Promise<Appointment[]> {
    const appointments: Appointment[] = [];

    // Process locations in parallel (within reason)
    const batchSize = 2; // Process 2 at a time to avoid overwhelming
    for (let i = 0; i < this.locations.length; i += batchSize) {
      const batch = this.locations.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(location => this.checkLocation(location))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          appointments.push(...result.value);
        } else if (result.status === 'rejected') {
          console.error('Location check failed:', result.reason);
        }
      }
    }

    return appointments;
  }

  private async checkLocation(location: DMVLocation): Promise<Appointment[]> {
    const url = `${this.baseUrl}/${location.id}`;
    console.log(`Checking ${location.name} at ${url}`);
    
    return withPage(url, async (page) => {
      const appointments: Appointment[] = [];

      // Wait for pickmeup calendar to load
      try {
        await page.waitForSelector('#cal-picker, .pmu-instance', {
          timeout: 15000
        });
        
        // Wait for calendar to be fully initialized
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log(`No calendar found for ${location.name}`);
        return appointments;
      }

      // Get available dates from the pickmeup calendar
      // The site uses pickmeup library with specific class names
      const dateSelectors = [
        '.pmu-days .pmu-button:not(.pmu-disabled):not(.pmu-not-in-month)',
        '.pickmeup .pmu-button:not(.pmu-disabled)',
        '#cal-picker .pmu-button:not(.pmu-disabled)'
      ];

      let dateElements = [];
      for (const selector of dateSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          dateElements = elements;
          console.log(`Found ${elements.length} date elements using selector: ${selector}`);
          break;
        }
      }

      if (dateElements.length === 0) {
        console.log(`No available dates found for ${location.name}`);
        return appointments;
      }

      // Check each available date
      for (const dateElement of dateElements) {
        try {
          // Get date from the pickmeup calendar
          // The date is usually in the element's text content
          let dateText = await dateElement.textContent() || '';
          dateText = dateText.trim();
          
          if (!dateText || isNaN(parseInt(dateText))) continue;
          
          // Get the full date by checking the calendar's current month/year
          // The site stores the full date in data attributes or we need to construct it
          const dateInfo = await page.evaluate((el) => {
            // Get the calendar instance
            const calendar = document.querySelector('#cal-picker');
            if (!calendar) return null;
            
            // Try to get month/year from calendar header
            const monthYearText = document.querySelector('.pmu-month')?.textContent || '';
            return { day: el.textContent, monthYear: monthYearText };
          }, dateElement);
          
          if (!dateInfo || !dateInfo.monthYear) continue;
          
          // Construct full date string
          dateText = `${dateInfo.monthYear} ${dateInfo.day}`;

          console.log(`Checking date: ${dateText}`);

          // Check if this date matches our monitoring rules
          if (isDateMatchingRules(dateText, this.monitoringConfig)) {
            // Click to see times
            await dateElement.click();
            await page.waitForTimeout(2000); // Wait for times to load

            // After clicking a date, the site shows time slots as links
            // Wait for time slots to load
            await page.waitForTimeout(1000);
            
            // Time slots are displayed as anchor tags with specific href patterns
            const timeSelectors = [
              'a[href*="time="]',
              '.time-slot a',
              'div.appointment-times a'
            ];

            let timeSlots = [];
            for (const selector of timeSelectors) {
              const slots = await page.$$(selector);
              if (slots.length > 0) {
                timeSlots = slots;
                console.log(`Found ${slots.length} time slots using selector: ${selector}`);
                break;
              }
            }

            const times: string[] = [];
            for (const slot of timeSlots) {
              const timeText = await slot.textContent() || 
                             await slot.getAttribute('value') || 
                             await slot.getAttribute('data-time') || '';
              if (timeText.trim()) {
                times.push(timeText.trim());
              }
            }

            if (times.length > 0) {
              // Parse date to get day of week
              const date = new Date(dateText);
              const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

              appointments.push({
                location: location.name,
                locationId: location.id,
                date: dateText,
                dayOfWeek,
                times,
                url
              });

              console.log(`Found appointment at ${location.name} on ${dateText} with ${times.length} time slots`);
            }
          }
        } catch (error) {
          console.error(`Error processing date element:`, error);
        }
      }

      return appointments;
    });
  }
}