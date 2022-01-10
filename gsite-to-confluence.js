const puppeteer = require('puppeteer');
const { makeChildren } = require('./common-util');
const { createPage } = require('./confluence-utility');

const SITE_HOME = 'https://sites.google.com/view/adnananabgsite/home';

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


    // Launch Browser
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: true
    });
    const page = await browser.newPage();

    // Go to google site
    await page.goto(SITE_HOME);

    await page.waitForSelector(MENU_PARENT_SELECTOR, { visible: false, timeout: 900000 })

    console.log('Page loaded')

    const menuParent = await page.$eval(MENU_PARENT_SELECTOR, el => {

        function getSpace(level) {
            let space = "";
            for (let index = 1; index < level; index++) {
                space = space + " ";
            }
            return space;
        }

        const menus = el.querySelectorAll(MENU_SELECTOR);
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
                    await newTab.waitForSelector('[data-type="1"]', { visible: false, timeout: 900000 })

                    const inner_html = await newTab.$eval(PARA_SELECTOR, element => element.innerHTML);


                    // If inner_html is not empty, then lets create a page in the confluence
                    if (inner_html && inner_html != "") {
                        // console.log('creating page in confluence')
                        pageContent = inner_html;
                    }

                } catch (error) {

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
                        "representation": "wiki"
                    }
                }
            };

            if (ancestor) {
                pageData.ancestors = [{"id":ancestor}]
            }

            await createPage(pageData).then(response => {
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