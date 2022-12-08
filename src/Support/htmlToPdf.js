import path from 'path';
export default async function htmlToPdf (puppeteer, html, namePdf, config) {
    let browser, page;
    try {
        browser = await puppeteer.launch({ executablePath: config.pathChrome });
        page = await browser.newPage();
        const client = await page.target().createCDPSession()
        if (config.pathDownload) {
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: config.pathDownload
            })
        }
        await page.setContent(html);
        await page.pdf({ path: path.join(config.pathDownload, namePdf).trim() })
        await browser.close();
        return true;
    } catch (error) {
        console.log(error);
        await browser.close();
    }

}