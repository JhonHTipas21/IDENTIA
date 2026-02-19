
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../../docs/assets/screenshots');
const BASE_URL = 'http://localhost:5173';

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: { width: 1440, height: 900 }
    });
    const page = await browser.newPage();

    console.log(`Navigating to ${BASE_URL}...`);
    try {
        // 1. Home Dashboard
        await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
        // Wait for animation
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'home_dashboard.png') });
        console.log('📸 Captured: Home Dashboard');

        // 2. Status Timeline (Click "Estado de mi Trámite")
        console.log('Finding Status button...');
        await page.waitForSelector('h3');
        const statusClicked = await page.evaluate(() => {
            const h3s = Array.from(document.querySelectorAll('h3'));
            const target = h3s.find(el => el.textContent.includes('Estado de mi Trámite'));
            if (target) {
                target.closest('div').click(); // Click the card/container
                return true;
            }
            return false;
        });

        if (statusClicked) {
            console.log('Clicked Status button, waiting for transition...');
            await new Promise(r => setTimeout(r, 1000));

            // Enter PIN "1234"
            const input = await page.$('input[type="text"]');
            if (input) {
                await input.type('1234');
                // Click Consultar using evaluate
                const consultarClicked = await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const target = btns.find(el => el.textContent.includes('Consultar'));
                    if (target) {
                        target.click();
                        return true;
                    }
                    return false;
                });

                if (consultarClicked) {
                    await new Promise(r => setTimeout(r, 2000));
                    await page.screenshot({ path: path.join(OUTPUT_DIR, 'status_timeline.png') });
                    console.log('📸 Captured: Status Timeline');
                }
            }

            // Go back Home
            await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
            await new Promise(r => setTimeout(r, 1000));
        }

        // 3. Matrimonio Service
        console.log('Finding Matrimonio button...');
        const matrimonioClicked = await page.evaluate(() => {
            const h3s = Array.from(document.querySelectorAll('h3'));
            const target = h3s.find(el => el.textContent.includes('Registro de Matrimonio'));
            if (target) {
                target.closest('div').click();
                return true;
            }
            return false;
        });

        if (matrimonioClicked) {
            await new Promise(r => setTimeout(r, 2500));
            await page.screenshot({ path: path.join(OUTPUT_DIR, 'matrimonio_service.png') });
            console.log('📸 Captured: Matrimonio Service');
        }

        // 4. Calendar Modal (Click "Agendar Cita" on status, but easier to trigger via functionality if possible, 
        // but without full flow it's hard. 
        // Alternative: Just capture the initial dashboard with the new "Estado" button is good enough for "new features".

        // Let's try to capture the "Agendar Cita" modal if we can simply by clicking "Agendar Cita" in a mocked way?
        // Actually, let's stick to the key 3 screens: Home, Status Result, Matrimonio Prompt.

    } catch (e) {
        console.error('Error capturing screenshots:', e);
    } finally {
        await browser.close();
    }
})();
