const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  const htmlPath = path.resolve('c:/Users/manik/OneDrive/Desktop/ReUseX/campusloop/ReUseX_Project_Submission.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  const pdfPath = path.resolve('c:/Users/manik/OneDrive/Desktop/ReUseX/campusloop/ReUseX_Project_Submission_ppt.pdf');
  // Set PDF dimensions to 16:9 (e.g., 1920x1080 points)
  await page.pdf({
    path: pdfPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
  });
  await browser.close();
  console.log('PDF generated at', pdfPath);
})();
