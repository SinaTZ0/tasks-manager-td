// Screenshots of a study route, one per option, to check every option before handing the study over.
// Copy into .tmp-claude/<topic>-study/ and run from the repo root with the dev server up:
//   node .tmp-claude/<topic>-study/shoot-study.mjs <topic> <options> [lang] [theme] [width]
// <topic> is the URL's (`head-panel`); <options> digits ("01234"); lang fa|en; theme light|dark; width in px.
// Writes shots/o<n>-<lang>-<theme>-<width>.png next to this script, and prints any page errors.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const [topic, opts = "01234", lang = "fa", theme = "light", width = "1440"] = process.argv.slice(2);

mkdirSync(join(DIR, "shots"), { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: Number(width), height: 900 }, colorScheme: theme });
// One sign-in for the whole run: the auth endpoints are rate limited.
await context.request.post(`${BASE}/api/auth/sign-in/email`, {
  data: { email: "admin@example.com", password: "change-me-please" },
  headers: { origin: BASE },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => message.type() === "error" && errors.push(message.text().slice(0, 200)));
await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
for (const opt of opts) {
  await page.goto(`${BASE}${lang === "en" ? "/en" : ""}/design-study/${topic}?opt=${opt}`, { waitUntil: "load" });
  await page.waitForSelector("[data-study-bar]", { timeout: 40000 });
  await page.addStyleTag({
    content: "[data-testid=tanstack_devtools], .tsqd-parent-container, .tsqd-open-btn-container { display: none !important }",
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(DIR, "shots", `o${opt}-${lang}-${theme}-${width}.png`) });
}
if (errors.length) console.error("page errors:", errors);
await browser.close();
