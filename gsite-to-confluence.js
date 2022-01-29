// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const request = require('request');
const fs = require('fs')
const { makeChildren } = require('./common-util');
const { createPage, uploadAttachement } = require('./confluence-utility');
const { parseHTMLDoc, parseElement, getMatchingTrailingStr } = require('./gsite-parser');

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
            let images = [];
            if (eachPage.value.url) {
                const pageUrl = 'https://sites.google.com' + eachPage.value.url;

                //TEMP
                console.log(pageUrl)

                const newTab = await browser.newPage();

                await newTab.goto(pageUrl, { waitUntil: 'load' });


                try {
                    // console.log('Loading Page ', pageUrl)
                    // await newTab.waitForNavigation();
                    await newTab.waitForSelector('.UtePc.RCETm.yxgWrb', { visible: false, timeout: 900000 })

                    await newTab.exposeFunction("parseHTMLDoc", parseHTMLDoc);
                    await newTab.exposeFunction("parseElement", parseElement);
                    await newTab.exposeFunction("getMatchingTrailingStr", getMatchingTrailingStr);

                    // const request = require('request');
                    async function downloadImage(src) {
                        console.log('downloading image from ', src)
                        const fileName = src.split('/').pop().split('#')[0].split('?')[0].split('=')[0];
                        const path = './pageImages/' + fileName + ".png";

                        request.head(src, function(err, res, body){
                            console.log('content-type:', res.headers['content-type']);
                            console.log('content-length:', res.headers['content-length']);
                        
                            request(src).pipe(fs.createWriteStream(path)).on('close', ()=>{});
                        });
                    }
                    
                    await newTab.exposeFunction("downloadImage", downloadImage);
                    
                    //TEMP
                    // await newTab.exposeFunction("getPageURL", async () => {Promise.resolve(pageUrl)});

                    const bodyHandle = await newTab.$('.UtePc.RCETm.yxgWrb');
                    const parsedHtml = await newTab.evaluate(async body => {
                        let htmlPage = '';
                        const childs = body.children;

                        function isExtraListElement(element) {
                            let extraListEl = false;
                            const tag = element.tagName.toLowerCase();
                            if (tag == 'li') {
                                return isExtraListElement(element.parentElement)
                            }
                            if ((tag == 'ol' || tag == 'ul') && element.children && element.children.length < 2) {
                                const firstChild = element.children[0];
                                if ( firstChild.tagName.toLowerCase() == 'li' && firstChild.children && firstChild.children.length < 2 && (firstChild.children[0].tagName.toLowerCase() == 'ol' || firstChild.children[0].tagName.toLowerCase() == 'ul') ) {
                                    extraListEl = true
                                }
                                
                            }
                            return extraListEl;
                        }

                        function shouldSkipElement(element) {
                            // If style has diplay:none then skip parsing
                            if (getComputedStyle(element).display == 'none') {
                                return true;
                            }
                            return false;
                        }


                        async function getHTMLOfElement(elements) {
                            let html = '';
                            let images = [];
                            for (let index = 0; index < elements.length; index++) {
                                const element = elements[index];

                                if (shouldSkipElement(element)) {
                                    html = html + '';
                                    Promise.resolve({html,images});
                                    return {html,images};
                                }

                                const tag = element.tagName.toLowerCase();

                                let skipParsing = isExtraListElement(element);

                                let attributes = {};
                                if (tag == 'a') {
                                    const href = element.getAttribute('href');
                                    if (href.startsWith('http')) {
                                        attributes = {
                                            href:element.getAttribute('href')
                                        }
                                    }
                                }
                                
                                // If page has image(img tag) download the image
                                // and save to ./pageImages/pageID path 
                                if (tag == 'img') {
                                    const src = element.getAttribute('src');

                                    // For internal images
                                    if (src && src.includes("googleusercontent.com")) {
                                        // const image = await fetch(src);
                                        const fileName = src.split('/').pop().split('#')[0].split('?')[0].split('=')[0];
                                        // const path = './pageImages/' + fileName + ".png";
                                        images.push(fileName);
                                        downloadImage(src)
                                        attributes = {
                                            imageFileName:fileName
                                        }
                                    }
                                }

                                async function getParentTag(tag, element) {
                                    let parentTag = `</${tag}>`
                                    if (tag == 'img') {
                                        parentTag = ''
                                    } else if (tag == 'iframe') {
                                        parentTag = ''
                                    } else if (tag == 'span' || tag == 'p') {
                                        const trailStr = await getMatchingTrailingStr(element.textContent, element.innerHTML)
                                        if (trailStr) {
                                            parentTag = `${trailStr}</${tag}>`
                                        }
                                    }
                                    Promise.resolve(parentTag);
                                    return parentTag
                                }

                                // handle iframe tag
                                if (tag == 'iframe') {
                                    attributes = {
                                        src: element.getAttribute('src'),
                                        width: getComputedStyle(element).width.slice(0, -2),
                                        height: getComputedStyle(element).height.slice(0, -2)
                                    }
                                }

                                // Do not traverse children for these elements
                                const skipChildrens = ['h1','h2','h3', 'iframe', 'img'];

                                let parsedHtml = skipParsing ? '' : await parseElement(tag, element.textContent, element.innerHTML, element.outerHTML, getComputedStyle(element), attributes);
                                let elementParsed = parsedHtml == '' ? false : true;
                                if (element.children && element.children.length > 0) {
                                    if (!skipChildrens.includes(tag)) {
                                        const childHtml = await getHTMLOfElement(element.children);
                                        parsedHtml = parsedHtml + childHtml.html
                                        images = images.concat(childHtml.images)
                                    }
                                    // parsedHtml = parsedHtml + (skipChildrens.includes(tag) ? '' : await getHTMLOfElement(element.children)).html;
                                }
                                html = html + parsedHtml + (elementParsed ? await getParentTag(tag, element) : '');
                            }
                            Promise.resolve({html,images});
                            return {html,images};
                        }

                        htmlPage = await getHTMLOfElement(childs);
                        return htmlPage;
                    }, bodyHandle);
                    await bodyHandle.dispose();

                    const html = parsedHtml.html
                    // console.log(parsedHtml.html)

                    if (parsedHtml.images && parsedHtml.images.length > 0) {
                        images = parsedHtml.images;
                    }


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
            // if (!apiToken) {
            //     throw "Please provide api token as fifth argument"
            // }


        //    return 
            await createPage(pageData, apiToken).then(response => {
                // console.log('response', response.body)
                console.log(
                    `Page: ${pageData.title} Response: ${response.status} ${response.statusText}`
                );
                return response.json();
            })
                .then(async text => {
                    // console.log(text);

                    // Upload images if images were present in the page
                    for (let index = 0; index < images.length; index++) {
                        const imageFileName = images[index];
                        const path = './pageImages/' + imageFileName + ".png";
                        uploadAttachement(text.id, path, imageFileName)
                    }

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