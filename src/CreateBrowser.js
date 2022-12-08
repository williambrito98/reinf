/**
 * 
 * @param puppeteer {import('puppeteer-core')} 
 * @param {*} config 
 * @param {*} headless 
 * @returns {{browser : import('puppeteer-core').Browser, page:import('puppeteer-core').Page} }
 */
export default async function (puppeteer, config, headless) {

    let browser = await puppeteer.launch({
        executablePath: config.pathChrome,
        headless: headless,
        defaultViewport: {
            width: 1200,
            height: 1080
        },
        slowMo: 20,
        args: [
            "--start-maximized",
            "--disable-web-security",
            "--enable-auto-reload",
            "--disable-infobars",
            "--no-default-browser-check",
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ],
        ignoreDefaultArgs: [
            "--enable-automation",
            "--disable-extensions"
        ],
        userDataDir: config.userDataDir
    });

    // let browser = await puppeteer.connect({
    //     browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/browser/6fb3309a-65f5-4dee-8562-92c7f5cbe5cb',
    //     slowMo: 50,
    //     ignoreHTTPSErrors: true,
    //     defaultViewport: {
    //         width: 1200,
    //         height: 1080
    //     },
    // })


    let page = await browser.newPage();


    await page.setDefaultTimeout(30000);
    await page.setDefaultNavigationTimeout(30000);

    const client = await page.target().createCDPSession()
    if (config.pathDownload) {
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: config.pathDownload
        })
    }

    page.on('dialog', async (dialog) => {
        await dialog.accept();
    });


    return { browser, page };
}