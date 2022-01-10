// Parse GSite HTML contents to create a content supported by Conluence API

function common(tag, html) {
    const el = document.createElement(tag);
    el.innerHTML = html;
    const parsedHtml = `<${el.tagName}>${el.textContent}</${el.tagName}>`;
    console.log('parsedHtml', parsedHtml)
    return parsedHtml;
}

parsers = {
    h1: common,
    h2: common,
    p: common
}

module.exports = {
    parseHTMLDoc: (el) => {
        console.log('parsing element')
        // Travers each element and parse through the parsers defined above
        let pageContent = '';
        const childElements = el.querySelectorAll('*');
        console.log('child elements has size', childElements.length)
        if (childElements) {
            for (let index = 0; index < childElements.length; index++) {
                const element = childElements[index];
                const tag = element.tagName;
                console.log('parsing for tag', tag);
                const parser = parsers[tag];
                if (parser) {
                    console.log('Parser found for ', tag)
                    pageContent = pageContent + parser();
                }
            }
            console.log('Parsed Page content', pageContent);
        }
        return pageContent;
    },

    parseElement: async (tag, html, text) => {
        switch (tag.trim()) {
            case 'h1':
            case 'h2':
            case 'p':
                const parsedHtml = `<${tag}>${text}</${tag}>`;
                Promise.resolve(parsedHtml)
                return parsedHtml;

            default:
                Promise.resolve('')
                return '';
        }
    }
};