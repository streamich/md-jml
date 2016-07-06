"use strict";
function escape(html, encode) {
    return html
        .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function unescape(html) {
    return html.replace(/&([#\w]+);/g, function (_, n) {
        n = n.toLowerCase();
        if (n === 'colon')
            return ':';
        if (n.charAt(0) === '#') {
            return n.charAt(1) === 'x'
                ? String.fromCharCode(parseInt(n.substring(2), 16))
                : String.fromCharCode(+n.substring(1));
        }
        return '';
    });
}
function replace(regex, opt) {
    regex = regex.source;
    opt = opt || '';
    return function _(name, val) {
        if (!name)
            return new RegExp(regex, opt);
        val = val.source || val;
        val = val.replace(/(^|[^\[])\^/g, '$1');
        regex = regex.replace(name, val);
        return _;
    };
}
var noop = function () { };
noop.exec = noop;
function merge(obj) {
    var i = 1, target, key;
    for (; i < arguments.length; i++) {
        target = arguments[i];
        for (key in target) {
            if (Object.prototype.hasOwnProperty.call(target, key)) {
                obj[key] = target[key];
            }
        }
    }
    return obj;
}
var allowed = { '<kbd>': null, '</kbd>': null };
exports.sanitizer = function (tag) {
    return allowed[tag] === null ? tag : escape(tag);
};
var grm;
(function (grm) {
    grm.block = {
        newline: /^\n+/,
        code: /^( {4}[^\n]+\n*)+/,
        fences: noop,
        hr: /^( *[-*_]){3,} *(?:\n+|$)/,
        heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
        nptable: noop,
        lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
        blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
        list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
        html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
        def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
        table: noop,
        paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
        text: /^[^\n]+/
    };
    grm.block.bullet = /(?:[*+-]|\d+\.)/;
    grm.block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
    grm.block.item = replace(grm.block.item, 'gm')(/bull/g, grm.block.bullet)();
    grm.block.list = replace(grm.block.list)(/bull/g, grm.block.bullet)('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')('def', '\\n+(?=' + grm.block.def.source + ')')();
    grm.block.blockquote = replace(grm.block.blockquote)('def', grm.block.def)();
    grm.block._tag = '(?!(?:'
        + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
        + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
        + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';
    grm.block.html = replace(grm.block.html)('comment', /<!--[\s\S]*?-->/)('closed', /<(tag)[\s\S]+?<\/\1>/)('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)(/tag/g, grm.block._tag)();
    grm.block.paragraph = replace(grm.block.paragraph)('hr', grm.block.hr)('heading', grm.block.heading)('lheading', grm.block.lheading)('blockquote', grm.block.blockquote)('tag', '<' + grm.block._tag)('def', grm.block.def)();
    grm.block.normal = merge({}, grm.block);
    grm.block.gfm = merge({}, grm.block.normal, {
        fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
        paragraph: /^/,
        heading: /^ *(#{1,6})( +)([^\n]+?) *#* *(?:\n+|$)/
    });
    grm.block.gfm.paragraph = replace(grm.block.paragraph)('(?!', '(?!'
        + grm.block.gfm.fences.source.replace('\\1', '\\2') + '|'
        + grm.block.list.source.replace('\\1', '\\3') + '|')();
    grm.block.tables = merge({}, grm.block.gfm, {
        nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
        table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
    });
    grm.inline = {
        escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
        autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
        url: noop,
        tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
        link: /^!?\[(inside)\]\(href\)/,
        reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
        nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
        strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
        em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
        code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
        br: /^ {2,}\n(?!\s*$)/,
        del: noop,
        text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
    };
    grm.inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
    grm.inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;
    grm.inline.link = replace(grm.inline.link)('inside', grm.inline._inside)('href', grm.inline._href)();
    grm.inline.reflink = replace(grm.inline.reflink)('inside', grm.inline._inside)();
    grm.inline.normal = merge({}, grm.inline);
    grm.inline.pedantic = merge({}, grm.inline.normal, {
        strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
        em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
    });
    grm.inline.gfm = merge({}, grm.inline.normal, {
        escape: replace(grm.inline.escape)('])', '~|])')(),
        url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
        del: /^~~(?=\S)([\s\S]*?\S)~~/,
        text: replace(grm.inline.text)(']|', '~]|')('|', '|https?://|')()
    });
    grm.inline.breaks = merge({}, grm.inline.gfm, {
        br: replace(grm.inline.br)('{2,}', '*')(),
        text: replace(grm.inline.gfm.text)('{2,}', '*')()
    });
})(grm = exports.grm || (exports.grm = {}));
exports.defaults = {
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    sanitizer: exports.sanitizer,
    mangle: true,
    smartLists: false,
    smartypants: false,
    attrClass: 'class',
    attrMeta: 'data-md'
};
var BlockLexer = (function () {
    function BlockLexer(options) {
        this.tokens = [];
        this.links = {};
        this.rules = grm.block.normal;
        this.options = options;
        if (this.options.gfm) {
            if (this.options.tables) {
                this.rules = grm.block.tables;
            }
            else {
                this.rules = grm.block.gfm;
            }
        }
    }
    BlockLexer.prototype.lex = function (src) {
        src = src
            .replace(/\r\n|\r/g, '\n')
            .replace(/\t/g, '    ')
            .replace(/\u00a0/g, ' ')
            .replace(/\u2424/g, '\n');
        this.token(src, true);
    };
    BlockLexer.prototype.token = function (src, top, bq, pos) {
        if (pos === void 0) { pos = 0; }
        var src = src.replace(/^ +$/gm, ''), next, loose, cap, bull, b, item, space, i, l, rules = this.rules, tokens = this.tokens;
        while (src) {
            if (cap = rules.newline.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                if (cap[0].length > 1)
                    tokens.push({ type: 1 });
            }
            if (cap = rules.code.exec(src)) {
                src = src.substring(cap[0].length);
                var text = cap[0].replace(/^ {4}/gm, '');
                this.tokens.push({
                    type: 4,
                    start: pos,
                    end: pos += cap[0].length,
                    text: !this.options.pedantic
                        ? text.replace(/\n+$/, '')
                        : text
                });
                continue;
            }
            if (cap = rules.fences.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: 4,
                    start: pos,
                    end: pos += cap[0].length,
                    lang: cap[2],
                    text: cap[3] || ''
                });
                continue;
            }
            if (cap = this.rules.heading.exec(src)) {
                src = src.substring(cap[0].length);
                var depth = cap[1].length;
                this.tokens.push({
                    type: 3,
                    start: pos,
                    end: pos += cap[0].length,
                    offset: depth + cap[2].length,
                    depth: depth,
                    text: cap[3]
                });
                continue;
            }
            if (top && (cap = this.rules.nptable.exec(src))) {
                src = src.substring(cap[0].length);
                item = {
                    type: 5,
                    start: pos,
                    end: pos += cap[0].length,
                    header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
                    align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
                    cells: cap[3].replace(/\n$/, '').split('\n')
                };
                for (i = 0; i < item.align.length; i++) {
                    if (/^ *-+: *$/.test(item.align[i])) {
                        item.align[i] = 'right';
                    }
                    else if (/^ *:-+: *$/.test(item.align[i])) {
                        item.align[i] = 'center';
                    }
                    else if (/^ *:-+ *$/.test(item.align[i])) {
                        item.align[i] = 'left';
                    }
                    else {
                        item.align[i] = null;
                    }
                }
                for (i = 0; i < item.cells.length; i++) {
                    item.cells[i] = item.cells[i].split(/ *\| */);
                }
                this.tokens.push(item);
                continue;
            }
            if (cap = this.rules.lheading.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: 3,
                    start: pos,
                    end: pos += cap[0].length,
                    depth: cap[2] === '=' ? 1 : 2,
                    text: cap[1]
                });
                continue;
            }
            if (cap = this.rules.hr.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: 2,
                    start: pos,
                    end: pos += cap[0].length
                });
                continue;
            }
            if (cap = this.rules.blockquote.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({ type: 6 });
                cap = cap[0].replace(/^ *> ?/gm, '');
                this.token(cap, top, true);
                this.tokens.push({
                    type: 7,
                    start: pos,
                    end: pos += cap[0].length
                });
                continue;
            }
            if (cap = this.rules.list.exec(src)) {
                src = src.substring(cap[0].length);
                bull = cap[2];
                this.tokens.push({
                    type: 8,
                    start: pos,
                    end: pos += cap[0].length,
                    ordered: bull.length > 1
                });
                cap = cap[0].match(this.rules.item);
                next = false;
                l = cap.length;
                i = 0;
                for (; i < l; i++) {
                    item = cap[i];
                    space = item.length;
                    item = item.replace(/^ *([*+-]|\d+\.) +/, '');
                    if (~item.indexOf('\n ')) {
                        space -= item.length;
                        item = !this.options.pedantic
                            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
                            : item.replace(/^ {1,4}/gm, '');
                    }
                    if (this.options.smartLists && i !== l - 1) {
                        b = grm.block.bullet.exec(cap[i + 1])[0];
                        if (bull !== b && !(bull.length > 1 && b.length > 1)) {
                            var prepend = cap.slice(i + 1).join('\n');
                            src = prepend + src;
                            pos -= prepend.length;
                            i = l - 1;
                        }
                    }
                    loose = next || /\n\n(?!\s*$)/.test(item);
                    if (i !== l - 1) {
                        next = item.charAt(item.length - 1) === '\n';
                        if (!loose)
                            loose = next;
                    }
                    this.tokens.push({ type: loose
                            ? 12
                            : 10 });
                    this.token(item, false, bq);
                    this.tokens.push({ type: loose
                            ? 13
                            : 11 });
                }
                this.tokens.push({ type: 9 });
                continue;
            }
            if (cap = this.rules.html.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: this.options.sanitize
                        ? 0
                        : 14,
                    start: pos,
                    end: pos += cap[0].length,
                    pre: !this.options.sanitizer && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
                    text: cap[0]
                });
                continue;
            }
            if ((!bq && top) && (cap = this.rules.def.exec(src))) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                this.links[cap[1].toLowerCase()] = { href: cap[2], title: cap[3] };
                continue;
            }
            if (top && (cap = this.rules.table.exec(src))) {
                src = src.substring(cap[0].length);
                item = {
                    type: 5,
                    start: pos,
                    end: pos += cap[0].length,
                    header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
                    align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
                    cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
                };
                for (i = 0; i < item.align.length; i++) {
                    if (/^ *-+: *$/.test(item.align[i])) {
                        item.align[i] = 'right';
                    }
                    else if (/^ *:-+: *$/.test(item.align[i])) {
                        item.align[i] = 'center';
                    }
                    else if (/^ *:-+ *$/.test(item.align[i])) {
                        item.align[i] = 'left';
                    }
                    else {
                        item.align[i] = null;
                    }
                }
                for (i = 0; i < item.cells.length; i++) {
                    item.cells[i] = item.cells[i].replace(/^ *\| *| *\| *$/g, '').split(/ *\| */);
                }
                this.tokens.push(item);
                continue;
            }
            if (top && (cap = this.rules.paragraph.exec(src))) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: 0,
                    start: pos,
                    end: pos += cap[0].length,
                    text: cap[1].charAt(cap[1].length - 1) === '\n'
                        ? cap[1].slice(0, -1)
                        : cap[1]
                });
                continue;
            }
            if (cap = this.rules.text.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: 15,
                    start: pos,
                    end: pos += cap[0].length,
                    text: cap[0]
                });
                continue;
            }
            if (src)
                throw Error('Infinite loop: ' + src);
        }
    };
    return BlockLexer;
}());
exports.BlockLexer = BlockLexer;
var InlineLexer = (function () {
    function InlineLexer(links, options, ast) {
        this.rules = grm.inline.normal;
        this.links = links;
        this.options = options;
        this.ast = ast;
        var inline = grm.inline;
        if (this.options.gfm) {
            if (this.options.breaks)
                this.rules = inline.breaks;
            else
                this.rules = inline.gfm;
        }
        else if (this.options.pedantic)
            this.rules = inline.pedantic;
    }
    InlineLexer.prototype.output = function (src, pos) {
        var _this = this;
        if (pos === void 0) { pos = 0; }
        var out = [], link, text, href, cap, options = this.options;
        var loop = function () {
            if (!src) {
                return;
            }
            if (cap = _this.rules.escape.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(cap[1]);
                continue;
            }
            if (cap = _this.rules.autolink.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                if (cap[2] === '@') {
                    text = cap[1].charAt(6) === ':'
                        ? _this.mangle(cap[1].substring(7))
                        : _this.mangle(cap[1]);
                    href = _this.mangle('mailto:') + text;
                }
                else {
                    text = escape(cap[1]);
                    href = text;
                }
                out.push(_this.ast.link(href, null, text));
                continue;
            }
            if (!_this.inLink && (cap = _this.rules.url.exec(src))) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                text = escape(cap[1]);
                href = text;
                out.push(_this.ast.link(href, null, text));
                continue;
            }
            if (cap = _this.rules.tag.exec(src)) {
                if (!_this.inLink && /^<a /i.test(cap[0])) {
                    _this.inLink = true;
                }
                else if (_this.inLink && /^<\/a>/i.test(cap[0])) {
                    _this.inLink = false;
                }
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(options.sanitize
                    ? (options.sanitizer
                        ? options.sanitizer(cap[0])
                        : escape(cap[0]))
                    : cap[0]);
                continue;
            }
            if (cap = _this.rules.link.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                _this.inLink = true;
                out.push(_this.outputLink(cap, {
                    href: cap[2],
                    title: cap[3]
                }));
                _this.inLink = false;
                continue;
            }
            if ((cap = _this.rules.reflink.exec(src))
                || (cap = _this.rules.nolink.exec(src))) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
                link = _this.links[link.toLowerCase()];
                if (!link || !link.href) {
                    out.push(cap[0].charAt(0));
                    var prepend = cap[0].substring(1);
                    src = prepend + src;
                    pos -= prepend.length;
                    continue;
                }
                _this.inLink = true;
                out.push(_this.outputLink(cap, link));
                _this.inLink = false;
                continue;
            }
            if (cap = _this.rules.strong.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(_this.ast.strong(_this.output(cap[2] || cap[1])));
                continue;
            }
            if (cap = _this.rules.em.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(_this.ast.em(_this.output(cap[2] || cap[1])));
                continue;
            }
            if (cap = _this.rules.code.exec(src)) {
                src = src.substring(cap[0].length);
                out.push(_this.ast.codespan({
                    start: pos,
                    end: pos += cap[0].length,
                    text: escape(cap[2], true)
                }));
                continue;
            }
            if (cap = _this.rules.br.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(_this.ast.br());
                continue;
            }
            if (cap = _this.rules.del.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(_this.ast.del(_this.output(cap[1])));
                continue;
            }
            if (cap = _this.rules.text.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(_this.ast.text(escape(_this.smartypants(cap[0]))));
                continue;
            }
            if (src)
                throw Error('Infinite loop: ' + src);
        };
        loop();
        return out;
    };
    InlineLexer.prototype.outputLink = function (cap, link) {
        var href = escape(link.href), title = link.title ? escape(link.title) : null;
        return cap[0].charAt(0) !== '!'
            ? this.ast.link(href, title, this.output(cap[1]))
            : this.ast.image(href, title, escape(cap[1]));
    };
    InlineLexer.prototype.smartypants = function (text) {
        if (!this.options.smartypants)
            return text;
        return text
            .replace(/---/g, '\u2014')
            .replace(/--/g, '\u2013')
            .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
            .replace(/'/g, '\u2019')
            .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
            .replace(/"/g, '\u201d')
            .replace(/\.{3}/g, '\u2026');
    };
    InlineLexer.prototype.mangle = function (text) {
        if (!this.options.mangle)
            return text;
        var out = '', l = text.length, i = 0, ch;
        for (; i < l; i++) {
            ch = text.charCodeAt(i);
            if (Math.random() > 0.5)
                ch = 'x' + ch.toString(16);
            out += '&#' + ch + ';';
        }
        return out;
    };
    return InlineLexer;
}());
exports.InlineLexer = InlineLexer;
var Ast = (function () {
    function Ast(options) {
        this.options = options;
    }
    Ast.prototype.addNodeMeta = function (token, attr) {
        if (this.options.attrMeta) {
            attr = attr || {};
            attr[this.options.attrMeta] = token.start + ',' + token.end;
        }
        return attr;
    };
    Ast.prototype.code = function (token, cb) {
        var text = token.text, lang = token.lang, escaped = token.escaped;
        var attr = null;
        if (lang) {
            attr = (_a = {}, _a[this.options.attrClass] = 'lang-' + escape(lang, true), _a);
        }
        cb(['pre', attr,
            ['code', null,
                escaped ? text : escape(text, true)
            ]
        ]);
        var _a;
    };
    Ast.prototype.blockquote = function (body) {
        return ['blockquote', null].concat(body);
    };
    Ast.prototype.html = function (html) {
        return html;
    };
    Ast.prototype.heading = function (token, body) {
        var attr = { id: 'header-' + token.text.toLowerCase().replace(/[^\w]+/g, '-') };
        attr = this.addNodeMeta(token, attr);
        return ['h' + token.depth, attr].concat(body);
    };
    Ast.prototype.hr = function () {
        return ['hr'];
    };
    Ast.prototype.list = function (body, ordered) {
        var type = ordered ? 'ol' : 'ul';
        return [type, null].concat(body);
    };
    Ast.prototype.listitem = function (body) {
        return ['li', null].concat(body);
    };
    Ast.prototype.paragraph = function (token, body) {
        return ['p', this.addNodeMeta(token, null)].concat(body);
    };
    Ast.prototype.table = function (header, body) {
        return ['table', null,
            ['thead', null].concat(header),
            ['tbody', null].concat(body),
        ];
    };
    Ast.prototype.tablerow = function (content) {
        return ['tr', null].concat(content);
    };
    Ast.prototype.tablecell = function (content, flags) {
        var type = flags.header ? 'th' : 'td';
        var attr = flags.align
            ? { style: 'text-align:' + flags.align }
            : null;
        return [type, attr].concat(content);
    };
    Ast.prototype.strong = function (body) {
        return ['strong', null].concat(body);
    };
    Ast.prototype.em = function (body) {
        return ['em', null].concat(body);
    };
    Ast.prototype.codespan = function (token, cb) {
        cb(['code', this.addNodeMeta(token, null), token.text]);
    };
    Ast.prototype.br = function () {
        return ['br', null];
    };
    Ast.prototype.del = function (body) {
        return ['del', null].concat(body);
    };
    Ast.prototype.link = function (href, title, text) {
        if (this.options.sanitize) {
            try {
                var prot = decodeURIComponent(unescape(href))
                    .replace(/[^\w:]/g, '')
                    .toLowerCase();
            }
            catch (e) {
                href = '#xss';
            }
            if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
                href = '#xss';
            }
        }
        var attr = { href: href };
        if (title)
            attr.title = title;
        return ['a', attr].concat(text);
    };
    Ast.prototype.image = function (href, title, text) {
        var attr = { src: href, alt: text };
        if (title)
            attr.title = title;
        return ['img', attr];
    };
    Ast.prototype.text = function (text) {
        return text;
    };
    return Ast;
}());
exports.Ast = Ast;
var Parser = (function () {
    function Parser(options) {
        if (options === void 0) { options = {}; }
        this.token = null;
        this.options = merge({}, exports.defaults, options);
        this.ast = this.options.ast = this.options.ast || new Ast(this.options);
    }
    Parser.prototype.parse = function (blexer, done) {
        var _this = this;
        this.inline = new InlineLexer(blexer.links, this.options, this.ast);
        this.tokens = blexer.tokens.reverse();
        console.log(this.tokens);
        var out = ['div', null];
        var loop = function () {
            if (_this.next()) {
                _this.tok(function (el) {
                    out.push(el);
                    loop();
                });
            }
            else
                done(out);
        };
        loop();
    };
    Parser.prototype.next = function () {
        return this.token = this.tokens.pop();
    };
    Parser.prototype.peek = function () {
        return this.tokens[this.tokens.length - 1] || 0;
    };
    Parser.prototype.parseText = function (cb) {
        var token = this.token;
        var text = token.text;
        var pos = token.start;
        while (this.peek().type === 15)
            text += '\n' + this.next().text;
        cb(this.inline.output(text, pos));
    };
    Parser.prototype.tok = function (cb) {
        var _this = this;
        var token = this.token, ast = this.ast, inline = this.inline;
        switch (token.type) {
            case 1: return cb(null);
            case 2: return cb(ast.hr());
            case 0:
                return cb(ast.paragraph(token, inline.output(token.text, token.start)));
            case 15: {
                return this.parseText(function (text) {
                    cb(ast.paragraph(token, text));
                });
            }
            case 3:
                return cb(ast.heading(token, inline.output(token.text, token.start + token.offset)));
            case 4: {
                return ast.code(token, cb);
            }
            case 5: {
                var header = [], body = [], i, row, cell, flags, j;
                cell = [];
                for (i = 0; i < token.header.length; i++) {
                    flags = { header: true, align: token.align[i] };
                    cell.push(ast.tablecell(this.inline.output(token.header[i]), { header: true, align: token.align[i] }));
                }
                header.push(ast.tablerow(cell));
                for (i = 0; i < token.cells.length; i++) {
                    row = token.cells[i];
                    cell = [];
                    for (j = 0; j < row.length; j++) {
                        cell.push(ast.tablecell(this.inline.output(row[j]), { header: false, align: token.align[j] }));
                    }
                    body.push(ast.tablerow(cell));
                }
                return cb(ast.table(header, body));
            }
            case 6: {
                var body = [];
                var loop = function () {
                    if (_this.next().type !== 7) {
                        _this.tok(function (el) {
                            body.push(el);
                            loop();
                        });
                    }
                    else
                        cb(ast.blockquote(body));
                };
                return loop();
            }
            case 8: {
                var body = [];
                var loop = function () {
                    if (_this.next().type !== 9) {
                        _this.tok(function (el) {
                            body.push(el);
                            loop();
                        });
                    }
                    else
                        cb(ast.list(body, token.ordered));
                };
                return loop();
            }
            case 10: {
                var body = [];
                var loop = function () {
                    var next = _this.next();
                    if (next.type !== 11) {
                        if (next.type === 15) {
                            _this.parseText(function (list) {
                                body = body.concat(list);
                                loop();
                            });
                        }
                        else {
                            _this.tok(function (el) {
                                body.push(el);
                                loop();
                            });
                        }
                    }
                    else
                        cb(ast.listitem(body));
                };
                return loop();
            }
            case 12: {
                var body = [];
                var loop = function () {
                    if (_this.next().type !== 13) {
                        _this.tok(function (el) {
                            body.push(el);
                            loop();
                        });
                    }
                    else
                        cb(ast.listitem(body));
                };
                return loop();
            }
            case 14: {
                var html = !this.token.pre && !this.options.pedantic
                    ? this.inline.output(this.token.text)
                    : this.token.text;
                return cb(ast.html(html));
            }
        }
    };
    return Parser;
}());
exports.Parser = Parser;
function parse(src, opt, done) {
    if (opt === void 0) { opt = {}; }
    if (opt)
        opt = merge({}, exports.defaults, opt);
    var lexer = new BlockLexer(opt);
    lexer.lex(src);
    var parser = new Parser(opt);
    return parser.parse(lexer, done);
}
exports.parse = parse;
