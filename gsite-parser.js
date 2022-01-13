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

const supportedStyles = [{name:'fontSize',tag:'font-size'}, {name:'fontFamily', tag:'font-family'}];

function getSupportedStyleString(computedStyle) {
    let styleStr = '';
    for (let index = 0; index < supportedStyles.length; index++) {
        const supportedStyle = supportedStyles[index];
        const value = computedStyle[supportedStyle.name];
        if (value) {
            styleStr = styleStr + supportedStyle.tag + ':' + value + ';';
        }
        
    }
    return styleStr;
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

    parseElement: async (tag, html, text, innerHTML, computedStyle) => {
        let parsedHtml;
        switch (tag.trim()) {
            case 'h1':
            case 'h2':
                parsedHtml = `<${tag}>${text}</${tag}>`;
                Promise.resolve(parsedHtml)
                return parsedHtml;

            case 'p':
                // console.log(computedStyle)
                const style = getSupportedStyleString(computedStyle)
                parsedHtml = `<${tag} style="${style}">${innerHTML}</${tag}>`;
                Promise.resolve(parsedHtml)
                return parsedHtml;

            default:
                Promise.resolve('')
                return '';
        }
    }
};