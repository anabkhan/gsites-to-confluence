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
{name:'marginLeft', tag:'margin-left'}, {name:'marginBottom', tag:'margin-bottom'}, {name:'lineHeight', tag:'line-height'}, {name:'backgroundColor', tag:'background-color'}];

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

function isHTMLTag(str) {
    return str.startsWith('<') || str.startsWith('>')
}

function getMatchingSubstr(str1, str2) {
    let matchedStr = '';
    if (str1 && str2) {
        if (isHTMLTag(str1) || isHTMLTag(str2)) {
            return '';
        }
        const len = str1.length < str2.length ? str1.length : str2.length
        for (let index = 0; index < len; index++) {
            charFromStr1 = str1[index];
            if (charFromStr1 == str2[index]) {
                matchedStr = matchedStr + charFromStr1;
            } else {
                break;
            }
        }
    }
    return matchedStr
}

async function getMatchingTrailingStr(text, innerHTML) {
    str = ''
    if (!((safe_tags_replace(text) == innerHTML) || (innerHTML && (innerHTML.trim().startsWith(text.trim()))))) {
        try {
            // That's just one lazy approach
            str =  getMatchingSubstr(text.split("").reverse().join(""), innerHTML.split("").reverse().join("")).split("").reverse().join("")
        } catch (error) {
        }
    }
    Promise.resolve(str);
    return str;
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
                } else {
                    const subStr = getMatchingSubstr(text, innerHTML)
                    if (subStr) {
                        parsedHtml = parsedHtml + subStr;
                    }

                    const trailStr = getMatchingTrailingStr(text, innerHTML)
                    if (trailStr) {
                        attributes[trailStr] = trailStr
                    }
                }
                break;

            case 'a':
                //&& (attributes.href.includes("http://www.google.com/url?q=") || attributes.href.includes("https://www.google.com/url?q="))
                if (attributes && attributes.href) {
                    attributes.href = decodeURIComponent(attributes.href)
                    if ((attributes.href.includes("http://www.google.com/url?q=") || attributes.href.includes("https://www.google.com/url?q="))) {
                        attributes.href = decodeURIComponent(attributes.href.replace("http://www.google.com/url?q=", ""))
                        attributes.href = decodeURIComponent(attributes.href.replace("https://www.google.com/url?q=", ""))

                        if (attributes.href.includes('&sa=')) {
                            attributes.href = attributes.href.split('&sa=')[0]
                        }
                    }
                    // attributes.href = decodeURIComponent(attributes.href.replace("http://www.google.com/url?q=", ""))
                    // attributes.href = decodeURIComponent(attributes.href.replace("https://www.google.com/url?q=", ""))
                    if (attributes.href.includes('&')) {
                        first = attributes.href.split('&')[0]
                        second = encodeURIComponent(attributes.href.replace(first, ''))
                        attributes.href = first + second
                    }
                }
                parsedHtml = `<a href="${attributes ? attributes.href: '#'}">`
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
                if (attributes && attributes.src) {
                    parsedHtml = `<ac:structured-macro ac:name="iframe" ac:schema-version="1" data-layout="default" ac:local-id="e97e31a8-345c-454d-a344-5d0dbad1e315" ac:macro-id="e976ca49765b978e883b1fe7d2347a4b"><ac:parameter ac:name="src"><ri:url ri:value="${safe_tags_replace(attributes.src)}" /></ac:parameter><ac:parameter ac:name="width">${attributes.width}</ac:parameter><ac:parameter ac:name="class">YMEQtf KfXz0b</ac:parameter><ac:parameter ac:name="height">${attributes.height}</ac:parameter></ac:structured-macro>`
                }
                break;

            case 'img':
                if (attributes && attributes.imageFileName) {
                    imageFileName = attributes.imageFileName;
                    parsedHtml = `<ac:image><ri:attachment ri:filename="${imageFileName}"/></ac:image>`;
                }
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

    },
    getMatchingTrailingStr
};