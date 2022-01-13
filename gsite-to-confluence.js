// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const { makeChildren } = require('./common-util');
const { createPage } = require('./confluence-utility');
const { parseHTMLDoc, parseElement } = require('./gsite-parser');

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// const SITE_HOME = 'https://sites.google.com/view/adnananabgsite/home';

const SITE_HOME = 'https://sites.google.com/exotel.in/tech/home';

// Menu Selectors

const MENU_PARENT_SELECTOR = '.jYxBte.Fpy8Db';
const MENU_SELECTOR = '.aJHbb.hDrhEe.HlqNPb';

// Page Selectors
const PARA_SELECTOR = 'p.CDt4Ke.zfr3Q';
const H1_SELECTOR = 'h1.heading'

const command = process.argv[2];
if (!command) {
    throw "Please provide command as a first argument (printmenu/migrate)";
}
async function run() {

    if (command == 'signin') {
        // Launch Browser
        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium-browser',
            args: ['--no-sandbox'],
            headless: false,
            userDataDir: "./user_data"
        });
        const page = await browser.newPage();

        // Go to google site
        await page.goto(SITE_HOME);
        return;
    }


    // Launch Browser
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: true,
        args: ['--no-sandbox'],
        userDataDir: "./user_data"
    });
    const page = await browser.newPage();

    // Go to google site
    await page.goto(SITE_HOME);

    await page.waitForSelector(MENU_PARENT_SELECTOR, { visible: false, timeout: 900000 })

    // console.log('Page loaded')

    const menuParent = await page.$eval(MENU_PARENT_SELECTOR, el => {

        const MENU_SELECTOR = '.aJHbb.hDrhEe.HlqNPb';

        function getSpace(level) {
            let space = "";
            for (let index = 1; index < level; index++) {
                space = space + " ";
            }
            return space;
        }

        const menus = el.querySelectorAll(MENU_SELECTOR);
        // console.log('Menus size ', menus.length)
        let items = '';
        for (let index = 0; index < menus.length; index++) {
            const item = menus.item(index);
            if (index > 0) {
                items = items + "\n";
            }
            items = items + getSpace(item.getAttribute('data-level')) + JSON.stringify(
                {
                    title: item.textContent,
                    url: item.getAttribute('href'),
                    type: item.getAttribute('href') ? 'page' : 'menu'
                }
            )
        }
        return items;
    });

    async function createPages(ancestor, pages) {
        for (let index = 0; index < pages.length; index++) {
            const eachPage = pages[index];

            // Get page content if its a page
            let pageContent = eachPage.value.title;
            if (eachPage.value.url) {
                const pageUrl = 'https://sites.google.com' + eachPage.value.url;

                const newTab = await browser.newPage();

                await newTab.goto(pageUrl);

                try {
                    // console.log('Loading Page ', pageUrl)
                    await newTab.waitForSelector('script', { visible: false, timeout: 900000 })

                    await newTab.exposeFunction("parseHTMLDoc", parseHTMLDoc);
                    await newTab.exposeFunction("parseElement", parseElement);
                    const bodyHandle = await newTab.$('body');
                    const html = await newTab.evaluate(async body => {
                        let htmlPage = '';
                        const childs = body.querySelectorAll('*');
                        for (let index = 0; index < childs.length; index++) {
                            const element = childs[index];
                            htmlPage = htmlPage + await parseElement(element.tagName.toLowerCase(), element.outerHTML, element.textContent, element.innerHTML, getComputedStyle(element))
                        }
                        return htmlPage;
                    }, bodyHandle);
                    await bodyHandle.dispose();

                    console.log(html)


                    if (html && html != "") {
                        pageContent = html;
                    }

                } catch (error) {
                    console.log(error)
                }
                newTab.close();
            }


            const pageData = {
                "space": {
                    "key": "CONFLUENCE12"
                },
                "type": "page",
                "title": eachPage.value.title,
                "body": {
                    "storage": {
                        "value": pageContent,
                        "representation": "storage"
                    }
                }
            };

            if (ancestor) {
                pageData.ancestors = [{ "id": ancestor }]
            }

            createPages(null, eachPage.children);

            const apiToken = process.argv[2];
            if (!apiToken) {
                throw "Please provide api toke as a second argument"
            }

            /*
            await createPage(pageData, apiToken).then(response => {
                console.log(
                    `Response: ${response.status} ${response.statusText}`
                );
                return response.json();
            })
            .then(text => {
                console.log(text.id);
                // Lets create child pages
                createPages(text.id,eachPage.children);
            })
            .catch(err => console.error(err));
            */

        }
    }

    if (command && command == 'printmenu') {
        console.log(JSON.stringify(makeChildren(menuParent), null, 2))
    }

    if (command && command == 'migrate') {
        createPages(null, makeChildren(menuParent))
    }
}

run();