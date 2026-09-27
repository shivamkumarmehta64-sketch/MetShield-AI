import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smoothScroll(page, targetY, steps = 25, stepDelay = 40) {
  const currentY = await page.evaluate(() => window.scrollY);
  const diff = targetY - currentY;
  for (let i = 1; i <= steps; i++) {
    const y = currentY + (diff * (i / steps));
    await page.evaluate((pos) => window.scrollTo({ top: pos, behavior: 'instant' }), y);
    await sleep(stepDelay);
  }
  await sleep(400);
}

async function main() {
  const outputDir = path.resolve('./public/videos');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Launching Chrome browser with Playwright for video recording...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const width = 1920;
  const height = 1080;

  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: {
      dir: outputDir,
      size: { width, height }
    }
  });

  const page = await context.newPage();

  console.log('1. Navigating to Landing Page (http://localhost:3000)...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2500);

  // Smoothly scroll through Landing Page
  console.log('Showcasing Landing Page hero & metrics...');
  await smoothScroll(page, 550);
  await sleep(1500);

  await smoothScroll(page, 1150);
  await sleep(1500);

  // Interact with Operational Use Cases tabs
  console.log('Interacting with operational benchmarks...');
  const useCaseButtons = page.locator('button:has-text("Hardware Sensor Spike"), button:has-text("Convective Storm"), button:has-text("Microclimate"), button:has-text("Sensor Drift")');
  const count = await useCaseButtons.count();
  for (let i = 0; i < Math.min(count, 4); i++) {
    try {
      await useCaseButtons.nth(i).click({ timeout: 2000 });
      await sleep(1500);
    } catch  {
      // Continue if not clickable
    }
  }

  await smoothScroll(page, 2000);
  await sleep(1500);
  await smoothScroll(page, 3200);
  await sleep(1500);
  await smoothScroll(page, 0, 20, 30);
  await sleep(1200);

  // 2. Dashboard
  console.log('2. Navigating to Dashboard (http://localhost:3000/dashboard)...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  // Interact with Map / Station selector
  console.log('Interacting with live stations on Dashboard...');
  const stationButtons = page.locator('button:has-text("AWS-"), button:has-text("Safdarjung"), button:has-text("Colaba"), button:has-text("Alipore")');
  const stnCount = await stationButtons.count();
  for (let i = 0; i < Math.min(stnCount, 3); i++) {
    try {
      await stationButtons.nth(i).click({ timeout: 2000 });
      await sleep(1800);
    } catch  {
      // Continue
    }
  }

  // Scroll down to observation console and gating panel
  await smoothScroll(page, 450);
  await sleep(2200);
  await smoothScroll(page, 850);
  await sleep(2200);

  // Click tabs: Analytics, Diagnostics, Simulator, Map
  console.log('Exploring Dashboard Tabs...');
  const tabs = ['Analytics', 'Diagnostics', 'Simulator', 'Map'];
  for (const tabName of tabs) {
    try {
      const tabButton = page.locator(`button:has-text("${tabName}")`).first();
      if (await tabButton.isVisible()) {
        await tabButton.click();
        await sleep(2500);
        await smoothScroll(page, 350, 10, 30);
        await sleep(1500);
        await smoothScroll(page, 0, 10, 30);
      }
    } catch  {
      // Continue
    }
  }

  // 3. Official Audit Report
  console.log('3. Navigating to Audit Report (http://localhost:3000/audit-report)...');
  await page.goto('http://localhost:3000/audit-report', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await smoothScroll(page, 600);
  await sleep(2000);
  await smoothScroll(page, 1200);
  await sleep(2500);

  // 4. Mobile Technician Companion
  console.log('4. Navigating to Mobile Field Portal (http://localhost:3000/mobile)...');
  await page.setViewportSize({ width: 420, height: 880 });
  await page.goto('http://localhost:3000/mobile', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await smoothScroll(page, 500);
  await sleep(2000);
  await smoothScroll(page, 900);
  await sleep(2000);

  // Return to main portal for closing view
  console.log('5. Returning to Full-HD Dashboard for conclusion...');
  await page.setViewportSize({ width, height });
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3500);

  console.log('Finishing and saving video recording...');
  const videoObj = page.video();
  await context.close();
  await browser.close();

  if (videoObj) {
    const rawVideoPath = await videoObj.path();
    const finalVideoPath = path.resolve('./public/localhost-recorded-walkthrough.webm');
    fs.copyFileSync(rawVideoPath, finalVideoPath);
    console.log(`\n========================================`);
    console.log(`Video recorded successfully!`);
    console.log(`Saved to: ${finalVideoPath}`);
    console.log(`Public URL: http://localhost:3000/localhost-recorded-walkthrough.webm`);
    console.log(`========================================\n`);
  } else {
    console.error('No video object returned.');
  }
}

main().catch((err) => {
  console.error('Error during video recording:', err);
  process.exit(1);
});
