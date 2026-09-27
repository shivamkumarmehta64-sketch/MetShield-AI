import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smoothScroll(page, targetY, steps = 25, stepDelay = 35) {
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

  console.log('Launching mobile viewport browser with Playwright...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  // Smartphone vertical dimensions (iPhone / Pixel proportions)
  const width = 412;
  const height = 915;

  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
    recordVideo: {
      dir: outputDir,
      size: { width: 720, height: 1280 }
    }
  });

  const page = await context.newPage();

  console.log('1. Navigating to Mobile Field Portal (/mobile)...');
  await page.goto('http://localhost:3000/mobile', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2500);

  // Switch between city presets
  console.log('Interacting with Indian city presets on mobile...');
  const cityButtons = page.locator('button:has-text("Mumbai"), button:has-text("Bengaluru"), button:has-text("New Delhi")');
  const count = await cityButtons.count();
  for (let i = 0; i < Math.min(count, 3); i++) {
    try {
      await cityButtons.nth(i).click({ timeout: 2000 });
      await sleep(1500);
    } catch  {}
  }

  // Scroll down to view sensor cards & calibration
  await smoothScroll(page, 400);
  await sleep(1800);
  await smoothScroll(page, 800);
  await sleep(2000);

  // Trigger telemetry transmission or anomaly
  console.log('Simulating telemetry send...');
  try {
    const sendButton = page.locator('button:has-text("Transmit"), button:has-text("Send"), button:has-text("Simulate")').first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
      await sleep(2000);
    }
  } catch  {}

  await smoothScroll(page, 1400);
  await sleep(2000);
  await smoothScroll(page, 0, 20, 30);
  await sleep(1200);

  // 2. Mobile Responsive Dashboard
  console.log('2. Navigating to Dashboard on mobile (/dashboard)...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await smoothScroll(page, 350);
  await sleep(2000);
  await smoothScroll(page, 750);
  await sleep(2000);

  // 3. Mobile Landing Page
  console.log('3. Navigating to Landing Page on mobile (/)...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2500);
  await smoothScroll(page, 450);
  await sleep(1500);
  await smoothScroll(page, 950);
  await sleep(1500);

  console.log('Finishing mobile recording...');
  const videoObj = page.video();
  await context.close();
  await browser.close();

  if (videoObj) {
    const rawVideoPath = await videoObj.path();
    const finalWebmPath = path.resolve('./public/localhost-mobile-walkthrough.webm');
    const finalMp4Path = path.resolve('./public/localhost-mobile-walkthrough.mp4');
    fs.copyFileSync(rawVideoPath, finalWebmPath);

    console.log(`Converting mobile vertical video to MP4 (${finalMp4Path})...`);
    execFileSync(ffmpeg, [
      '-y',
      '-i', finalWebmPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      finalMp4Path
    ], { stdio: 'inherit' });

    console.log('Mobile portrait video successfully created!');
  }
}

main().catch(err => {
  console.error('Error recording mobile video:', err);
  process.exit(1);
});
