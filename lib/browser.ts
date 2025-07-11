import chromium from '@sparticuz/chromium';
import { Browser, Page, chromium as playwrightChromium } from 'playwright-core';

// Optimize for Vercel serverless
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

export async function getBrowser(): Promise<Browser> {
  // For local development
  if (process.env.NODE_ENV === 'development' || !process.env.VERCEL) {
    return await playwrightChromium.launch({
      headless: true
    });
  }

  // For Vercel deployment
  const browser = await playwrightChromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headlessMode,
  });

  return browser;
}

export async function withPage<T>(
  url: string,
  callback: (page: Page) => Promise<T>,
  pageLoadTimeout: number = 20000
): Promise<T> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Set a reasonable viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Navigate with faster loading strategy
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', // Faster than networkidle
      timeout: pageLoadTimeout 
    });
    
    return await callback(page);
  } catch (error) {
    console.error(`Error processing page ${url}:`, error);
    throw error;
  } finally {
    await page.close();
    await browser.close();
  }
}