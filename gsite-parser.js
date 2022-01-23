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

const supportedStyles = [{name:'fontSize',tag:'font-size'}, {name:'fontFamily', tag:'font-family'},
{name:'listStyleType', tag:'list-style-type'}, {name:'textAlign', tag:'text-align'}, {name:'marginTop', tag:'margin-top'},
{name:'marginLeft', tag:'margin-left'}, {name:'marginBottom', tag:'margin-bottom'}, {name:'lineHeight', tag:'line-height'}];

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

var symbolToReplace = {
    '=': '%3d;',
}

function replaceSymbol(symbol) {
    return symbolToReplace[symbol] || symbol;
}

function encodeUri(uri) {
    return encodeURI(uri).replace(/[=]/g, replaceSymbol);
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

    parseElement: async (tag, text, innerHTML, outerHTML, computedStyle, attributes) => {
        let parsedHtml = '';
        switch (tag.trim()) {
            case 'h1':
            case 'h2':
            case 'h3':
                parsedHtml = `<${tag} style="${getSupportedStyleString(computedStyle)}">${text}`;
                break;

            case 'p':
            case 'span':
                const style = getSupportedStyleString(computedStyle)
                parsedHtml = `<${tag} style="${style}">`;
                
                if (text && ((text == innerHTML || safe_tags_replace(text) == innerHTML) || (innerHTML && (innerHTML.trim().startsWith(text.trim()))))) {
                    text = safe_tags_replace(text)
                    parsedHtml = parsedHtml + text;
                }
                break;

            case 'a':
                parsedHtml = `<a href="${attributes ? encodeURIComponent(attributes.href): '#'}">`
                if (text && ((text == innerHTML || safe_tags_replace(text) == innerHTML) || (innerHTML && (innerHTML.trim().startsWith(text.trim()))))) {
                    text = safe_tags_replace(text)
                    parsedHtml = parsedHtml + text;
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

            case 'iframe':
                // parsedHtml = `<${tag}>${innerHTML}`;
                break;

            case 'img':
                console.log('image is present ', outerHTML)
                break;

            default:
                parsedHtml = '';
                if (text && ((text == innerHTML || safe_tags_replace(text) == innerHTML) || (innerHTML && (innerHTML.trim().startsWith(text.trim()))))) {
                    text = safe_tags_replace(text)
                    parsedHtml = `<${tag}>${text}`;
                }
                break;
        }
        Promise.resolve(parsedHtml);
        return parsedHtml;

    }
};