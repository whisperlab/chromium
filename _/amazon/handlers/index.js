const { ok } = require("assert");
const { createHash } = require("crypto");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const util = require('util')
const zlib = require('zlib')

const gzip = util.promisify(zlib.gzip)

exports.handler = async (event, context) => {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      dumpio: true,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    console.log("Chromium version", await browser.version());

    const contexts = [browser.defaultBrowserContext()];

    while (contexts.length < event.length) {
      contexts.push(await browser.createBrowserContext());
    }

    for (let context of contexts) {
      const job = event.shift();
      const page = await context.newPage();

      if (job.hasOwnProperty("url") === true) {
        await page.goto(job.url, { waitUntil: ["domcontentloaded", "load"] });

        if (job.hasOwnProperty("expected") === true) {
          if (job.expected.hasOwnProperty("title") === true) {
            try {
              ok(
                (await page.title()) === job.expected.title,
                `Title assertion failed.`
              );
            } catch (e) {
              console.log('title', await page.title())
              throw e
            }
          }

          if (job.expected.hasOwnProperty("screenshot") === true) {
            if (job.expected.hasOwnProperty("remove") === true) {
              await page.evaluate((selector) => {
                document.getElementById(selector).remove();
              }, job.expected.remove);
            }
            const screenshot = await page.screenshot();
            const imgBase64 = screenshot.toString('base64')
            const hash = createHash('sha1').update(imgBase64).digest('hex')
            /*
            console.log(
              `data:image/png;base64,${screenshot.toString("base64")}`,
              createHash("sha1")
                .update(screenshot.toString("base64"))
                .digest("hex")
            );
            */
            try {
              ok(
                hash === job.expected.screenshot,
                `Screenshot assertion failed.`
              );
            } catch (e) {
              console.log('hash', hash)
              console.log('img', (await gzip(imgBase64)).toString('base64'))
              console.log('content', await page.content())
              throw e
            }
          }
        }
      }
    }
  } catch (error) {
    throw error.message;
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return true;
};
