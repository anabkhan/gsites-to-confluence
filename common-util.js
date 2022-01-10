const sanitize = (str = "") =>
  str.trim().replace(/\n\s*\n/g, "\n")

const cut = (str = "", char = "") =>
{ const pos = str.search(char)
  return pos === -1
    ? [ str, "" ]
    : [ str.substr(0, pos), str.substr(pos + 1) ]
}

const outdent = (str = "") =>
{ const spaces = Math.max(0, str.search(/\S/))
  const re = new RegExp(`(^|\n)\\s{${spaces}}`, "g")
  return str.replace(re, "$1")
}

const makeChildren = (str) =>
  str === ""
    ? []
    : str.split(/\n(?!\s)/).map(make1)

const make1 = (str = "") =>
{ const [ value, children ] = cut(str, "\n")
  return { value: JSON.parse(value), children: makeChildren(outdent(children)) }
}

module.exports = {
    makeChildren
}