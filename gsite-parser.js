// Parse GSite HTML contents to create a content supported by Conluence API

function common(tag, html) {
    const el = document.createElement(tag);
    el.innerHTML = html;
    const parsedHtml = `<${el.tagName}>${el.textContent}</${el.tagName}>`;
    // console.log('parsedHtml', parsedHtml)
    return parsedHtml;
}

parsers = {
    h1: common,
    h2: common,
    p: common
}

function addslashes( str ) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

const supportedStyles = [{name:'fontSize',tag:'font-size'}, {name:'fontFamily', tag:'font-family'}, {name:'listStyleType', tag:'list-style-type'}];

function getSupportedStyleString(computedStyle) {
    let styleStr = '';
    for (let index = 0; index < supportedStyles.length; index++) {
        const supportedStyle = supportedStyles[index];
        const value = computedStyle[supportedStyle.name];
        if (value) {
            styleStr = styleStr + supportedStyle.tag + ':' + value + ';';
        }
        
    }
    return addslashes(styleStr.replace(/\"/g, '\''));
}

var tagsToReplace = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};

function replaceTag(tag) {
    return tagsToReplace[tag] || tag;
}

function safe_tags_replace(str) {
    return str.replace(/[&<>]/g, replaceTag);
}

module.exports = {
    parseHTMLDoc: (el) => {
        // Travers each element and parse through the parsers defined above
        let pageContent = '';
        const childElements = el.querySelectorAll('*');
        if (childElements) {
            for (let index = 0; index < childElements.length; index++) {
                const element = childElements[index];
                const tag = element.tagName;
                const parser = parsers[tag];
                if (parser) {
                    pageContent = pageContent + parser();
                }
            }
        }
        return pageContent;
    },

    parseElement: async (tag, html, text, innerHTML, computedStyle, parentTag, nextElementTag, nextSiblingTag, closingTag) => {
        let parsedHtml;
        switch (tag.trim()) {
            case 'h1':
            case 'h2':
            case 'h3':
                parsedHtml = `<${tag}>${text}</${tag}>`;
                break;

            case 'p':
                // console.log(computedStyle)
                const style = getSupportedStyleString(computedStyle)
                // console.log('P text ', text);
                // console.log('P parent', parentTag);
                // console.log('p nextSibling', nextSiblingTag)
                if (text) {
                    text = safe_tags_replace(text)
                }
                parsedHtml = `<${tag} style="${style}">${text}</${tag}>`;

                if (parentTag === 'li' && !nextSiblingTag) {
                    parsedHtml = parsedHtml + '</li>'
                }
                break;

            case 'li':
                const liStyle = getSupportedStyleString(computedStyle)
                parsedHtml = `<${tag} style="${liStyle}">`;
                // if (nextSiblingTag !== 'li') {
                //     parsedHtml = parsedHtml + `</${tag}>`
                // }
                break;

            case 'ol':
            case 'ul':
                parsedHtml = `<${tag}>`;
                break;

            default:
                parsedHtml = '';
                break;
        }
        if (closingTag) {
            parsedHtml = parsedHtml + closingTag
        }
        Promise.resolve(parsedHtml);
        return parsedHtml;

    }
};