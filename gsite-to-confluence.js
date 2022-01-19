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



                    // await newTab.exposeFunction("getClosingTag", getClosingTag);

                    const bodyHandle = await newTab.$('.UtePc.RCETm.yxgWrb');
                    const html = await newTab.evaluate(async body => {
                        let htmlPage = '';
                        const childs = body.querySelectorAll('*');
                        for (let index = 0; index < childs.length; index++) {
                            const element = childs[index];

                            const parentTag = element.parentNode ? element.parentNode.nodeName.toLowerCase() : null;

                            const nextElement = index < childs.length - 1 ? childs[index + 1] : null;
                            const nextElementTag = nextElement ? nextElement.nodeName.toLowerCase() : null;

                            const nextSiblingTag = element.nextSibling ? element.nextSibling.nodeName.toLowerCase() : null;

                            function isLiHasOl(element) {
                                return element && element.tagName.toLowerCase() == 'li' && element.children && element.children.length > 0
                                && (element.children[0].nodeName.toLowerCase() == 'ol' || element.children[0].nodeName.toLowerCase() == 'ul')
                            }

                            function isOlHasSingleLi(element) {
                                return (element.tagName.toLowerCase() == 'ol' || element.tagName.toLowerCase() == 'ul') && element.children && element.children.length < 2
                                && isLiHasOl(element.children[0]);
                            }

                            function getClosingTag(element) {
                                let closingTag = '';
                                const parentTag = element.parentNode ? element.parentNode.nodeName.toLowerCase() : null;
                                if (parentTag == 'li' || parentTag == 'ol' || parentTag == 'ul') {
                                    // get next sibling of parent
                                    // const nextSiblingOfParent = element.parentNode ? element.parentNode.nextSibling : null;

                                    if (!element.parentNode.nextSibling) {
                                        const parentOfParent = element.parentNode.parentNode;
                                        if (parentOfParent) {
                                            const parentOfParentTag = parentOfParent.nodeName.toLowerCase();
                                            if (parentOfParentTag == 'ol' || parentOfParentTag == 'ul' || parentOfParentTag == 'li') {
                                                // lets skip <ol> which has only one <li> as in confluence it shows the bullets
                                                if (!(isOlHasSingleLi(parentOfParent))) {
                                                    if (!(parentOfParentTag == 'li' && (parentTag == 'ul' && parentTag == 'ol' && isOlHasSingleLi(parentOfParent.parentNode)))) {
                                                        closingTag = `</${parentOfParentTag}>` + getClosingTag(element.parentNode);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                return closingTag;
                            }

                            // lets determine the closing tag
                            let closingTag = element.nodeName.toLowerCase() == 'p' && !element.nextSibling ? getClosingTag(element) : null;

                            // lets skip <ol> which has only one <li> as in confluence it shows the bullets
                            if (isOlHasSingleLi(element)) {
                                continue;
                            }

                            if (element.nodeName.toLowerCase() == 'li' && element.children && element.children.length > 0) {
                                const firstChild = element.children[0].tagName.toLowerCase();
                                if (firstChild == 'ul' || firstChild == 'ol') {
                                    if (isOlHasSingleLi(element.parentNode)) {
                                        continue;
                                    }
                                }
                            }

                            htmlPage = htmlPage + await parseElement(element.tagName.toLowerCase(), element.outerHTML,
                                element.textContent, element.innerHTML, getComputedStyle(element), parentTag, nextElementTag, nextSiblingTag, closingTag)
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

            // createPages(null, eachPage.children);

            const apiToken = process.argv[5];
            if (!apiToken) {
                throw "Please provide api token as fifth argument"
            }


            await createPage(pageData, apiToken).then(response => {
                // console.log('response', response.body)
                console.log(
                    `Response: ${response.status} ${response.statusText}`
                );
                return response.json();
            })
                .then(text => {
                    console.log(text);
                    // Lets create child pages
                    // createPages(text.id,eachPage.children);
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

    if (command && command == 'migratepage') {
        const pageTitle = process.argv[3];
        if (!pageTitle) {
            throw "Please provide page title as third argument"
        }

        const pageUrl = process.argv[4];
        if (!pageUrl) {
            throw "Please provide page url as fourth argument"
        }
        createPages(null, [{
            "value": {
                "title": pageTitle,
                "url": pageUrl,
                "type": "page"
            },
            "children": []
        }])

    }
}

run();