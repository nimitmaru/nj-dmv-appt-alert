import { chromium } from 'playwright-core';

async function exploreDMVSite() {
  const browser = await chromium.launch({ 
    headless: false
  });
  
  try {
    // First, let's check the main appointment type page
    console.log('=== Exploring Appointment Types Page ===');
    const page1 = await browser.newPage();
    await page1.setViewportSize({ width: 1280, height: 800 });
    await page1.goto('https://telegov.njportal.com/njmvc/AppointmentWizard', { waitUntil: 'networkidle' });
    await page1.waitForTimeout(3000);
    
    // Get all appointment type links
    const appointmentTypes = await page1.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/AppointmentWizard/"]'));
      return links.map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href'),
        classes: link.className
      }));
    });
    
    console.log('Appointment Types Found:', appointmentTypes);
    
    // Now let's check the Transfer from out of state page
    console.log('\n=== Exploring Transfer from Out of State (Type 7) ===');
    const page2 = await browser.newPage();
    await page2.setViewportSize({ width: 1280, height: 800 });
    await page2.goto('https://telegov.njportal.com/njmvc/AppointmentWizard/7', { waitUntil: 'networkidle' });
    await page2.waitForTimeout(3000);
    
    // Get location links
    const locations = await page2.evaluate(() => {
      const locationElements = Array.from(document.querySelectorAll('a[href*="/AppointmentWizard/7/"]'));
      return locationElements.map(el => ({
        name: el.textContent?.trim(),
        href: el.getAttribute('href'),
        id: el.getAttribute('href')?.match(/\/7\/(\d+)/)?.[1]
      }));
    });
    
    console.log('Locations Found:', locations);
    
    // Let's check Edison location specifically
    console.log('\n=== Exploring Edison Location (ID 52) ===');
    const page3 = await browser.newPage();
    await page3.setViewportSize({ width: 1280, height: 800 });
    await page3.goto('https://telegov.njportal.com/njmvc/AppointmentWizard/7/52', { waitUntil: 'networkidle' });
    await page3.waitForTimeout(5000);
    
    // Analyze the calendar structure
    const calendarInfo = await page3.evaluate(() => {
      const info: any = {
        calendarSelectors: [],
        dateSelectors: [],
        availableDates: [],
        disabledDates: []
      };
      
      // Find calendar containers
      const possibleCalendars = [
        '.calendar', 
        '[class*="calendar"]', 
        '.datepicker',
        '[class*="datepicker"]',
        '#ui-datepicker-div',
        '.ui-datepicker'
      ];
      
      possibleCalendars.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          info.calendarSelectors.push({
            selector,
            count: elements.length,
            classes: Array.from(elements[0].classList)
          });
        }
      });
      
      // Find date cells
      const dateSelectors = [
        'td.day',
        '.ui-datepicker-calendar td',
        '[data-date]',
        '.calendar-day',
        'button[aria-label*="day"]'
      ];
      
      dateSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          info.dateSelectors.push({
            selector,
            count: elements.length,
            sample: Array.from(elements).slice(0, 3).map(el => ({
              text: el.textContent?.trim(),
              classes: Array.from(el.classList),
              attributes: {
                'data-date': el.getAttribute('data-date'),
                'aria-label': el.getAttribute('aria-label'),
                'disabled': el.hasAttribute('disabled')
              }
            }))
          });
        }
      });
      
      // Get available vs disabled dates
      const allDateCells = document.querySelectorAll('.ui-datepicker-calendar td');
      allDateCells.forEach(cell => {
        const text = cell.textContent?.trim();
        if (text && !isNaN(parseInt(text))) {
          if (cell.classList.contains('ui-datepicker-unselectable') || 
              cell.classList.contains('ui-state-disabled')) {
            info.disabledDates.push(text);
          } else if (!cell.classList.contains('ui-datepicker-other-month')) {
            info.availableDates.push(text);
          }
        }
      });
      
      return info;
    });
    
    console.log('Calendar Structure:', JSON.stringify(calendarInfo, null, 2));
    
    // Try clicking on an available date if any
    if (calendarInfo.availableDates.length > 0) {
      console.log('\n=== Trying to click on an available date ===');
      
      const clicked = await page3.evaluate((dateText) => {
        const cells = document.querySelectorAll('.ui-datepicker-calendar td');
        for (const cell of cells) {
          if (cell.textContent?.trim() === dateText && 
              !cell.classList.contains('ui-datepicker-unselectable')) {
            (cell as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, calendarInfo.availableDates[0]);
      
      if (clicked) {
        await page3.waitForTimeout(3000);
        
        // Check for time slots
        const timeSlotInfo = await page3.evaluate(() => {
          const timeSelectors = [
            'input[type="radio"][name*="time"]',
            '.time-slot',
            '.appointment-time',
            'button[class*="time"]',
            '[name="selectedTime"]'
          ];
          
          const results: any = {};
          timeSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              results[selector] = Array.from(elements).slice(0, 5).map(el => ({
                tag: el.tagName,
                text: el.textContent?.trim() || (el as HTMLInputElement).value,
                value: (el as HTMLInputElement).value,
                disabled: (el as HTMLInputElement).disabled,
                classes: Array.from(el.classList)
              }));
            }
          });
          
          return results;
        });
        
        console.log('Time Slot Structure:', JSON.stringify(timeSlotInfo, null, 2));
      }
    }
    
    console.log('\nPress Ctrl+C to exit...');
    await new Promise(() => {}); // Keep browser open
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

exploreDMVSite().catch(console.error);