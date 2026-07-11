import { chromium } from "playwright-core";
const exe = "/home/senul/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
const OUT = "/tmp/claude-1000/-home-senul-reflow/cc03bb67-f9d9-43c6-8a33-230ed86c572b/scratchpad";
const routes = process.argv.slice(2);
const targets = routes.length ? routes : [["home",""]];
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
for (const scheme of ["light","dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const spec of targets) {
    const [name, path] = spec.split(":");
    await page.goto(`http://localhost:8099/${path||""}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${name}-${scheme}.png` });
    console.log(`shot ${name}-${scheme}`);
  }
  await ctx.close();
}
await browser.close();
