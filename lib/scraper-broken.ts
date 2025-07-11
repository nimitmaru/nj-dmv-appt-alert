import { withPage } from './browser';
import { isDateMatchingRules } from './date-matcher';
import { getMonitoringConfig } from './config';
import type { DMVLocation, Appointment } from './types';
import { format, parse } from 'date-fns';

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
        // Wait for calendar to be fully initialized and dates to load
        await page.waitForTimeout(5000);
        
        // Trigger a month load to ensure dates are fetched
        await page.evaluate(() => {
          // @ts-ignore
          if (typeof loadDatesForMonth === 'function') {
            const today = new Date();
            loadDatesForMonth(today.getMonth(), today.getFullYear());
          }
        });
        
        await page.waitForTimeout(2000); // Wait for AJAX to complete
      } catch (error) {
        console.log(`Calendar not found for ${location.name}`);
        return appointments;
      }

      // Get available dates from the pickmeup calendar
      const availableDatesData = await page.evaluate(() => {
        const dates: string[] = [];
        
        // Method 1: Check the availableDates JavaScript variable
        // @ts-ignore - accessing global variable
        if (typeof availableDates !== 'undefined' && availableDates) {
          for (const timestamp in availableDates) {
            if (availableDates[timestamp] === true) {
              // Convert timestamp (seconds) to date
              const date = new Date(parseInt(timestamp) * 1000);
              dates.push(date.toISOString().split('T')[0]);
            }
          }
        }
        
        // Method 2: If no dates from variable, check the DOM
        if (dates.length === 0) {
          // Look for available date cells in pickmeup calendar
          const availableCells = document.querySelectorAll('.pmu-days .pmu-button:not(.pmu-disabled):not(.pmu-not-in-month)');
          
          availableCells.forEach(cell => {
            const day = cell.textContent?.trim();
            if (day && !isNaN(parseInt(day))) {
              // Get the month/year from the calendar header
              const monthYearEl = document.querySelector('.pmu-month');
              if (monthYearEl) {
                const monthYearText = monthYearEl.textContent || '';
                // Parse month year like "July, 2025"
                const [monthName, yearStr] = monthYearText.split(',').map(s => s.trim());
                if (monthName && yearStr) {
                  const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
                                     'July', 'August', 'September', 'October', 'November', 'December']
                                     .indexOf(monthName);
                  if (monthIndex !== -1) {
                    const date = new Date(parseInt(yearStr), monthIndex, parseInt(day));
                    dates.push(date.toISOString().split('T')[0]);
                  }
                }
              }
            }
          });
        }
        
        return [...new Set(dates)]; // Remove duplicates
      });

      console.log(`Found ${availableDatesData.length} available dates at ${location.name}`);

      // Check each available date
      for (const dateStr of availableDatesData) {
        try {
          const date = new Date(dateStr);
          const dayOfWeek = format(date, 'EEEE');
          const formattedDate = format(date, 'MM/dd/yyyy');
          
          // Check if this date matches our monitoring rules
          if (isDateMatchingRules(formattedDate, this.monitoringConfig)) {
            console.log(`Date ${formattedDate} (${dayOfWeek}) matches monitoring rules`);
            
            // Click on the date in the pickmeup calendar
            const dateClicked = await page.evaluate((targetDate) => {
              const dateObj = new Date(targetDate);
              const day = dateObj.getDate();
              
              // Find the date button in pickmeup calendar
              const buttons = document.querySelectorAll('.pmu-days .pmu-button');
              for (const button of buttons) {
                if (button.textContent?.trim() === day.toString() && 
                    !button.classList.contains('pmu-disabled') &&
                    !button.classList.contains('pmu-not-in-month')) {
                  (button as HTMLElement).click();
                  return true;
                }
              }
              return false;
            }, dateStr);

            if (!dateClicked) {
              console.log(`Could not click date ${formattedDate}`);
              continue;
            }

            // Wait for time slots to load
            await page.waitForTimeout(2000);

            // Extract time slots - they appear as links after date selection
            const timeSlotData = await page.evaluate(() => {
              const slots: string[] = [];
              
              // Look for time slot links
              const timeLinks = document.querySelectorAll('a[href*="time="]');
              timeLinks.forEach(link => {
                const text = link.textContent?.trim();
                if (text && text.includes('AM') || text?.includes('PM')) {
                  slots.push(text);
                }
              });
              
              // Also check for any elements that might contain time information
              if (slots.length === 0) {
                const timeElements = document.querySelectorAll('[class*="time"], [id*="time"]');
                timeElements.forEach(el => {
                  const text = el.textContent?.trim();
                  if (text && (text.includes('AM') || text.includes('PM'))) {
                    slots.push(text);
                  }
                });
              }
              
              return [...new Set(slots)]; // Remove duplicates
            });

            if (timeSlotData.length > 0) {
              appointments.push({
                location: location.name,
                locationId: location.id,
                date: formattedDate,
                dayOfWeek,
                times: timeSlotData,
                url
              });

              console.log(`Found ${timeSlotData.length} time slots for ${formattedDate} at ${location.name}`);
            }
          }
        } catch (error) {
          console.error(`Error processing date ${dateStr}:`, error);
        }
      }

      return appointments;
    });
  }
}