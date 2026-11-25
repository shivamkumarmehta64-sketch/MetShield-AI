import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const artifactDir = 'C:\\Users\\shiva\\.gemini\\antigravity\\brain\\7df87e84-ac99-455b-8a16-4345dfafe5cc';
  console.log('Launching Chromium via Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. Let live curves populate for 3.5 seconds
  console.log('Waiting 3.5 seconds for live telemetry curves to populate...');
  await page.waitForTimeout(3500);

  // Screenshot 1: Baseline Canvas
  const shot1 = path.join(artifactDir, 'walkthrough_1_baseline_canvas.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('Captured baseline screenshot:', shot1);

  // Verify Header
  const titleText = await page.textContent('body');
  if (!titleText?.includes('METSHIELD AI — NAWS-QMS v4.2')) {
    throw new Error('Header title missing METSHIELD AI');
  }

  // 2. Expand Stealth Diagnostic Drawer
  console.log('Expanding diagnostic drawer...');
  await page.click('summary');
  await page.waitForTimeout(1000);

  // 3. Trigger "Simulate Thermistor Open-Circuit"
  console.log('Clicking "Simulate Thermistor Open-Circuit"...');
  await page.getByRole('button', { name: /Simulate Thermistor Open-Circuit/i }).click();
  await page.waitForTimeout(3000);

  // Screenshot 2: Red Hardware Fault
  const shot2 = path.join(artifactDir, 'walkthrough_2_thermistor_spike_fault.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log('Captured thermistor fault screenshot:', shot2);

  const incidentText = await page.textContent('body');
  const hasSpikeCard = incidentText?.includes('SENSOR HARDWARE FAULT') || incidentText?.includes('SENSOR_SPIKE');
  console.log('Hardware fault card rendered:', hasSpikeCard);

  // 4. Trigger "Simulate Convective Front Dynamics"
  console.log('Clicking "Simulate Convective Front Dynamics"...');
  await page.getByRole('button', { name: /Simulate Convective Front Dynamics/i }).click();
  await page.waitForTimeout(3000);

  // Screenshot 3: Blue Storm Event
  const shot3 = path.join(artifactDir, 'walkthrough_3_convective_front_storm.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log('Captured convective storm screenshot:', shot3);

  const hasStormCard = (await page.textContent('body'))?.includes('CONVECTIVE FRONT (STORM)');
  console.log('Convective storm badge rendered:', hasStormCard);

  // 5. Trigger "Export QC Audit Log (.csv)"
  console.log('Triggering CSV export...');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export QC Audit Log/i }).click();
  const download = await downloadPromise;
  const csvPath = path.join(artifactDir, download.suggestedFilename());
  await download.saveAs(csvPath);
  console.log('Saved CSV audit export to:', csvPath);

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  console.log('CSV Header Preview:\n', csvContent.split('\n').slice(0, 10).join('\n'));

  await browser.close();
  console.log('WALKTHROUGH COMPLETED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('Walkthrough error:', err);
  process.exit(1);
});
