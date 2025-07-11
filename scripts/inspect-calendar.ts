import { chromium } from 'playwright-core';

async function inspectCalendar() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  try {
    const page = await browser.newPage();
    console.log('Navigating to Edison DMV page...');
    
    await page.goto('https://telegov.njportal.com/njmvc/AppointmentWizard/7/52', { 
      waitUntil: 'networkidle' 
    });
    
    // Wait for calendar
    await page.waitForSelector('#cal-picker', { timeout: 30000 });
    console.log('Calendar found!');
    
    // Wait for initialization
    await page.waitForTimeout(5000);
    
    // Inspect the page state
    const pageInfo = await page.evaluate(() => {
      const info: any = {
        hasCalendar: !!document.querySelector('#cal-picker'),
        hasPickmeup: !!document.querySelector('.pmu-instance'),
        availableDatesVar: null,
        globalFunctions: [],
        calendarStructure: null,
        availableDateElements: []
      };
      
      // Check for availableDates variable
      try {
        // @ts-ignore
        if (typeof availableDates !== 'undefined') {
          info.availableDatesVar = {};
          // @ts-ignore
          for (const key in availableDates) {
            // @ts-ignore
            info.availableDatesVar[key] = availableDates[key];
          }
        }
      } catch (e) {}
      
      // Check for global functions
      ['loadDatesForMonth', 'pickmeup', 'jQuery'].forEach(fn => {
        // @ts-ignore
        if (typeof window[fn] !== 'undefined') {
          info.globalFunctions.push(fn);
        }
      });
      
      // Get calendar structure
      const calendar = document.querySelector('.pmu-instance');
      if (calendar) {
        info.calendarStructure = {
          classes: calendar.className,
          childrenCount: calendar.children.length,
          monthHeader: document.querySelector('.pmu-month')?.textContent,
          dayButtons: Array.from(document.querySelectorAll('.pmu-days .pmu-button')).map(btn => ({
            text: btn.textContent,
            classes: btn.className,
            disabled: btn.classList.contains('pmu-disabled')
          })).slice(0, 10) // First 10 for brevity
        };
      }
      
      // Find available dates in DOM
      const availableButtons = document.querySelectorAll('.pmu-days .pmu-button:not(.pmu-disabled):not(.pmu-not-in-month)');
      info.availableDateElements = Array.from(availableButtons).map(btn => btn.textContent?.trim());
      
      return info;
    });
    
    console.log('\n=== Page Information ===');
    console.log(JSON.stringify(pageInfo, null, 2));
    
    // Try to trigger month navigation to load more dates
    console.log('\n=== Trying to load next month ===');
    await page.evaluate(() => {
      // Click next month button if available
      const nextButton = document.querySelector('.pmu-next');
      if (nextButton) {
        (nextButton as HTMLElement).click();
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Check again after navigation
    const nextMonthInfo = await page.evaluate(() => {
      return {
        monthHeader: document.querySelector('.pmu-month')?.textContent,
        availableDates: Array.from(document.querySelectorAll('.pmu-days .pmu-button:not(.pmu-disabled):not(.pmu-not-in-month)'))
          .map(btn => btn.textContent?.trim())
      };
    });
    
    console.log('\n=== Next Month Info ===');
    console.log(JSON.stringify(nextMonthInfo, null, 2));
    
    // Try clicking on an available date
    const clicked = await page.evaluate(() => {
      const availableButton = document.querySelector('.pmu-days .pmu-button:not(.pmu-disabled):not(.pmu-not-in-month)');
      if (availableButton) {
        (availableButton as HTMLElement).click();
        return availableButton.textContent;
      }
      return null;
    });
    
    if (clicked) {
      console.log(`\n=== Clicked on date: ${clicked} ===`);
      await page.waitForTimeout(3000);
      
      // Check what happens after clicking
      const afterClick = await page.evaluate(() => {
        return {
          timeSlots: Array.from(document.querySelectorAll('a[href*="time="]')).map(a => ({
            text: a.textContent?.trim(),
            href: (a as HTMLAnchorElement).href
          })),
          anyTimeElements: Array.from(document.querySelectorAll('[class*="time"], [id*="time"]'))
            .slice(0, 5)
            .map(el => ({
              tag: el.tagName,
              text: el.textContent?.trim()?.substring(0, 50),
              classes: el.className
            }))
        };
      });
      
      console.log('\n=== After Click Info ===');
      console.log(JSON.stringify(afterClick, null, 2));
    }
    
    console.log('\n\nKeeping browser open for manual inspection. Press Ctrl+C to close...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

inspectCalendar().catch(console.error);