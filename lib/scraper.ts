import { withPage } from './browser';
import { isDateMatchingRules } from './date-matcher';
import { getMonitoringConfig } from './config';
import type { DMVLocation, Appointment } from './types';
import { format, addDays } from 'date-fns';

export class DMVChecker {
  private baseUrl = 'https://telegov.njportal.com/njmvc/AppointmentWizard/7';
  private monitoringConfig = getMonitoringConfig();

  constructor(private locations: DMVLocation[]) {}

  async checkAllLocations(): Promise<Appointment[]> {
    const appointments: Appointment[] = [];

    // Process locations sequentially to avoid overwhelming the site
    for (const location of this.locations) {
      try {
        const locationAppointments = await this.checkLocation(location);
        appointments.push(...locationAppointments);
      } catch (error) {
        console.error(`Failed to check ${location.name}:`, error);
      }
      
      // Small delay between locations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return appointments;
  }

  private async checkLocation(location: DMVLocation): Promise<Appointment[]> {
    const url = `${this.baseUrl}/${location.id}`;
    console.log(`Checking ${location.name} at ${url}`);
    
    return withPage(url, async (page) => {
      const appointments: Appointment[] = [];

      // Wait for the pickmeup calendar to load
      try {
        await page.waitForSelector('#cal-picker', { timeout: 15000 });
        await page.waitForTimeout(5000); // Let calendar fully initialize and load dates
      } catch (error) {
        console.log(`Calendar not found for ${location.name}`);
        return appointments;
      }

      // Get search configuration
      const searchConfig = this.monitoringConfig.searchConfig;
      
      let totalDatesFound = 0;
      const maxDates = searchConfig.maxDatesPerLocation;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = addDays(today, searchConfig.maxDaysAhead);
      
      // Check months until we exceed maxDaysAhead
      let monthOffset = 0;
      let shouldContinue = true;
      
      while (shouldContinue && totalDatesFound < maxDates) {
        // Navigate to the month if needed
        if (monthOffset > 0) {
          await page.click('.pmu-next');
          await page.waitForTimeout(2000); // Wait for month to load
        }

        // Get current month/year from calendar
        const monthYearText = await page.$eval('.pmu-month', el => el.textContent || '');
        console.log(`Checking ${monthYearText} at ${location.name}`);

        // Get all available dates in this month
        const availableDates = await page.$$eval(
          '.pmu-days .pmu-button:not(.pmu-disabled):not(.pmu-not-in-month)', 
          buttons => buttons.map(btn => btn.textContent?.trim() || '')
        );

        console.log(`Available dates in ${monthYearText}: ${availableDates.join(', ')}`);

        if (availableDates.length === 0) {
          console.log(`No available dates in ${monthYearText} at ${location.name}`);
          continue;
        }

        // Parse month and year
        const [monthName, yearStr] = monthYearText.split(',').map(s => s.trim());
        const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December']
                           .indexOf(monthName);
        const year = parseInt(yearStr);

        if (monthIndex === -1 || isNaN(year)) {
          console.error(`Failed to parse month/year: ${monthYearText}`);
          monthOffset++;
          continue;
        }
        
        // Check each available date
        let datesCheckedInMonth = 0;
        let datesSkippedInMonth = 0;
        
        for (const dayStr of availableDates) {
          const day = parseInt(dayStr);
          if (isNaN(day)) continue;

          const date = new Date(year, monthIndex, day);
          
          // Skip this specific date if it's beyond maxDaysAhead
          if (date > maxDate) {
            datesSkippedInMonth++;
            continue;
          }
          
          datesCheckedInMonth++;
          const dayOfWeek = format(date, 'EEEE');
          const formattedDate = format(date, 'MM/dd/yyyy');

          // Check if this date matches our monitoring rules
          const matchesRules = isDateMatchingRules(formattedDate, this.monitoringConfig);
          if (!matchesRules) {
            console.log(`Date ${formattedDate} (${dayOfWeek}) does NOT match rules`);
          } else {
            console.log(`Date ${formattedDate} (${dayOfWeek}) matches monitoring rules`);
            
            // Click on the date
            const dateClicked = await page.evaluate((targetDay) => {
              const buttons = document.querySelectorAll('.pmu-days .pmu-button');
              for (const button of buttons) {
                if (button.textContent?.trim() === targetDay && 
                    !button.classList.contains('pmu-disabled') &&
                    !button.classList.contains('pmu-not-in-month')) {
                  (button as HTMLElement).click();
                  return true;
                }
              }
              return false;
            }, dayStr);

            if (!dateClicked) {
              console.log(`Could not click date ${formattedDate}`);
              continue;
            }

            // Wait for time slots to load
            await page.waitForTimeout(3000);

            // Extract time slots - they appear as divs with class "timeCard availableTimeslot"
            const timeSlotData = await page.$$eval(
              '.timeCard.availableTimeslot, .col.timeCard.availableTimeslot',
              slots => slots.map(slot => slot.textContent?.trim() || '').filter(text => text.includes('AM') || text.includes('PM'))
            );

            // Also check for links with time parameter
            if (timeSlotData.length === 0) {
              const linkTimes = await page.$$eval(
                'a[href*="time="]',
                links => links.map(link => link.textContent?.trim() || '').filter(text => text.includes('AM') || text.includes('PM'))
              );
              timeSlotData.push(...linkTimes);
            }

            if (timeSlotData.length > 0) {
              appointments.push({
                location: location.name,
                locationId: location.id,
                date: formattedDate,
                dayOfWeek,
                times: [...new Set(timeSlotData)], // Remove duplicates
                url
              });

              console.log(`Found ${timeSlotData.length} time slots for ${formattedDate} at ${location.name}`);
              totalDatesFound++;
              
              // Stop if we've found enough dates
              if (totalDatesFound >= maxDates) {
                console.log(`Reached max dates limit (${maxDates}) for ${location.name}`);
                break;
              }
            } else {
              console.log(`No time slots found for ${formattedDate} at ${location.name}`);
            }
          }
        }
        
        // Log what happened in this month
        if (datesSkippedInMonth > 0 && datesCheckedInMonth === 0) {
          console.log(`All ${datesSkippedInMonth} dates in ${monthYearText} are beyond maxDaysAhead limit`);
          shouldContinue = false;
          break;
        }
        
        // Stop checking more months if we've found enough dates
        if (totalDatesFound >= maxDates) {
          break;
        }
        
        monthOffset++;
      }

      return appointments;
    });
  }
}