import { chromium } from 'playwright-core';

async function debugDMVSite() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('https://telegov.njportal.com/njmvc/AppointmentWizard/7/52', { 
      waitUntil: 'networkidle' 
    });
    
    // Wait for calendar to load
    await page.waitForTimeout(5000);
    
    // Debug: Check what's on the page
    const debugInfo = await page.evaluate(() => {
      const info: any = {
        calendarFound: false,
        availableDatesVar: null,
        calendarSelectors: {},
        dateElements: []
      };
      
      // Check for calendar
      const calendarSelectors = [
        '#cal-picker',
        '.pickmeup',
        '.pmu-instance',
        '.ui-datepicker',
        '[class*="calendar"]'
      ];
      
      calendarSelectors.forEach(selector => {
        const el = document.querySelector(selector);
        info.calendarSelectors[selector] = !!el;
        if (el) info.calendarFound = true;
      });
      
      // Check for availableDates variable
      try {
        // @ts-ignore
        if (typeof availableDates !== 'undefined') {
          info.availableDatesVar = availableDates;
        }
      } catch (e) {}
      
      // Check for date cells
      const dateSelectors = [
        '.pmu-days .pmu-button',
        '.pmu-button:not(.pmu-disabled)',
        '.ui-datepicker-calendar td',
        'td.day',
        '[data-handler="selectDay"]'
      ];
      
      dateSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          info.dateElements.push({
            selector,
            count: elements.length,
            samples: Array.from(elements).slice(0, 5).map(el => ({
              text: el.textContent,
              classes: el.className,
              // @ts-ignore
              onclick: el.onclick ? 'has onclick' : 'no onclick',
              dataset: Object.keys((el as HTMLElement).dataset || {})
            }))
          });
        }
      });
      
      // Check page content
      info.pageTitle = document.title;
      info.hasJQuery = typeof (window as any).jQuery !== 'undefined';
      
      return info;
    });
    
    console.log('Debug Info:', JSON.stringify(debugInfo, null, 2));
    
    // Try to interact with the calendar
    console.log('\nTrying to find available dates...');
    
    // Method 1: Check for jQuery datepicker
    const jqueryDates = await page.evaluate(() => {
      try {
        // @ts-ignore
        if (window.jQuery && window.jQuery.datepicker) {
          const picker = jQuery('#cal-picker');
          if (picker.length) {
            // @ts-ignore
            const dates = picker.datepicker('getDate');
            return { hasDatepicker: true, dates };
          }
        }
      } catch (e) {}
      return { hasDatepicker: false };
    });
    
    console.log('jQuery Datepicker:', jqueryDates);
    
    // Method 2: Look for available date cells
    const availableCells = await page.$$eval('td[data-handler="selectDay"]:not(.ui-datepicker-unselectable)', cells => 
      cells.map(cell => ({
        text: cell.textContent,
        month: cell.getAttribute('data-month'),
        year: cell.getAttribute('data-year'),
        classes: cell.className
      }))
    );
    
    console.log('Available date cells:', availableCells);
    
    // Keep browser open for inspection
    console.log('\nBrowser is open for inspection. Press Ctrl+C to close...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugDMVSite().catch(console.error);