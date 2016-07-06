// `md-jml` is a port of [marked](https://github.com/chjj/marked) to TypeScript.
//
// Original `marked` project license:
//
// Copyright (c) 2011-2014, Christopher Jeffrey. (MIT License)
// Copyright (c) 2011-2014, Christopher Jeffrey (https://github.com/chjj/)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

function escape(html, encode?) {
    return html
        .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function unescape(html) {
    return html.replace(/&([#\w]+);/g, function(_, n) {
        n = n.toLowerCase();
        if (n === 'colon') return ':';
        if (n.charAt(0) === '#') {
            return n.charAt(1) === 'x'
                ? String.fromCharCode(parseInt(n.substring(2), 16))
                : String.fromCharCode(+n.substring(1));
        }
        return '';
    });
}

function replace(regex, opt?): any {
    regex = regex.source;
    opt = opt || '';
    return function _(name, val): any {
        if (!name) return new RegExp(regex, opt);
        val = val.source || val;
        val = val.replace(/(^|[^\[])\^/g, '$1');
        regex = regex.replace(name, val);
        return _;
    };
}

var noop: any = function () {};
noop.exec = noop;

function merge(...objs: any[]);
function merge(obj) {
    var i = 1
        , target
        , key;

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

export type Isanitizer = (tag: string) => string;
var allowed = {'<kbd>': null, '</kbd>': null};
export var sanitizer: Isanitizer = function(tag) {
    return allowed[tag] === null ? tag : escape(tag);
};


// Grammar
export namespace grm {

    // Block-Level Grammar
    export var block: any = {
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

    block.bullet = /(?:[*+-]|\d+\.)/;
    block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
    block.item = replace(block.item, 'gm')
    (/bull/g, block.bullet)
    ();

    block.list = replace(block.list)
    (/bull/g, block.bullet)
    ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
    ('def', '\\n+(?=' + block.def.source + ')')
    ();

    block.blockquote = replace(block.blockquote)
    ('def', block.def)
    ();

    block._tag = '(?!(?:'
        + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
        + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
        + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

    block.html = replace(block.html)
    ('comment', /<!--[\s\S]*?-->/)
    ('closed', /<(tag)[\s\S]+?<\/\1>/)
    ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
    (/tag/g, block._tag)
    ();

    block.paragraph = replace(block.paragraph)
    ('hr', block.hr)
    ('heading', block.heading)
    ('lheading', block.lheading)
    ('blockquote', block.blockquote)
    ('tag', '<' + block._tag)
    ('def', block.def)
    ();

    // Normal Block Grammar
    block.normal = merge({}, block);

    // GFM Block Grammar
    block.gfm = merge({}, block.normal, {
        fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
        paragraph: /^/,
        heading: /^ *(#{1,6})( +)([^\n]+?) *#* *(?:\n+|$)/
    });

    block.gfm.paragraph = replace(block.paragraph)
    ('(?!', '(?!'
        + block.gfm.fences.source.replace('\\1', '\\2') + '|'
        + block.list.source.replace('\\1', '\\3') + '|')
    ();

    // GFM + Tables Block Grammar
    block.tables = merge({}, block.gfm, {
        nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
        table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
    });


    // Inline-Level Grammar
    export var inline: any = {
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

    inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
    inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

    inline.link = replace(inline.link)
    ('inside', inline._inside)
    ('href', inline._href)
    ();

    inline.reflink = replace(inline.reflink)
    ('inside', inline._inside)
    ();

    // Normal Inline Grammar
    inline.normal = merge({}, inline);

    // Pedantic Inline Grammar
    inline.pedantic = merge({}, inline.normal, {
        strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
        em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
    });

    // GFM Inline Grammar
    inline.gfm = merge({}, inline.normal, {
        escape: replace(inline.escape)('])', '~|])')(),
        url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
        del: /^~~(?=\S)([\s\S]*?\S)~~/,
        text: replace(inline.text)
        (']|', '~]|')
        ('|', '|https?://|')
        ()
    });

    // GFM + Line Breaks Inline Grammar
    inline.breaks = merge({}, inline.gfm, {
        br: replace(inline.br)('{2,}', '*')(),
        text: replace(inline.gfm.text)('{2,}', '*')()
    });
}


// Token type
const enum TTYPE {
    PARAGRAPH           = 0,
    SPACE               = 1,
    HR                  = 2,
    HEADING             = 3,
    CODE                = 4,
    TABLE               = 5,
    BLOCKQUOTE_START    = 6,
    BLOCKQUOTE_END      = 7,
    LIST_START          = 8,
    LIST_END            = 9,
    LIST_ITEM_START     = 10,
    LIST_ITEM_END       = 11,
    LOOSE_ITEM_START    = 12,
    LOOSE_ITEM_END      = 13,
    HTML                = 14,
    TEXT                = 15,
}


export interface IOptions {
    gfm?: boolean,
    tables?: boolean,
    breaks?: boolean,
    pedantic?: boolean,
    sanitize?: boolean,
    sanitizer?: Isanitizer,
    mangle?: boolean,
    smartLists?: boolean,
    smartypants?: boolean,
    ast?: Ast,
    attrClass: string,
    attrMeta: string,
}

export var defaults = {
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    sanitizer: sanitizer,
    mangle: true,
    smartLists: false,
    smartypants: false,
    attrClass: 'class',
    attrMeta: 'data-md',
};


export interface IToken {
    type?: TTYPE;
    start?: number;     // Start position of the token
    end?: number;       // End position of the token

    // Offset where the actual text content of the token start that is fed to `InlineLexer`
    // For example:
    //
    // # Title
    //
    // Would have offset of 2: "# "
    offset?: number;

    depth?: number;
    text?: string;
    lang?: string;
    ordered?: boolean;
}


export class BlockLexer {

    tokens: IToken[] = [];

    links: any = {};

    options: IOptions;

    rules = grm.block.normal;

    constructor (options) {
        this.options = options;
        if (this.options.gfm) {
            if (this.options.tables) {
                this.rules = grm.block.tables;
            } else {
                this.rules = grm.block.gfm;
            }
        }
    }

    lex(src) {
        src = src
            .replace(/\r\n|\r/g, '\n')
            .replace(/\t/g, '    ')
            .replace(/\u00a0/g, ' ')
            .replace(/\u2424/g, '\n');
        this.token(src, true);
    }

    token(src, top, bq?, pos = 0) {
        var src = src.replace(/^ +$/gm, ''), next, loose, cap, bull, b, item, space, i, l,
            rules = this.rules, tokens = this.tokens;
        while (src) {
            // newline
            if (cap = rules.newline.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                if (cap[0].length > 1) tokens.push({type: TTYPE.SPACE});
            }

            // code
            if (cap = rules.code.exec(src)) {
                src = src.substring(cap[0].length);
                var text = cap[0].replace(/^ {4}/gm, '');
                this.tokens.push({
                    type: TTYPE.CODE,
                    start: pos,
                    end: pos += cap[0].length,
                    text: !this.options.pedantic
                        ? text.replace(/\n+$/, '')
                        : text
                });
                continue;
            }

            // fences (gfm)
            if (cap = rules.fences.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: TTYPE.CODE,
                    start: pos,
                    end: pos += cap[0].length,
                    lang: cap[2],
                    text: cap[3] || '',
                });
                continue;
            }

            // heading
            if (cap = this.rules.heading.exec(src)) {
                src = src.substring(cap[0].length);
                var depth = cap[1].length;
                this.tokens.push({
                    type: TTYPE.HEADING,
                    start: pos,
                    end: pos += cap[0].length,
                    offset: depth + cap[2].length,
                    depth: depth,
                    text: cap[3],
                });
                continue;
            }

            // table no leading pipe (gfm)
            if (top && (cap = this.rules.nptable.exec(src))) {
                src = src.substring(cap[0].length);

                item = {
                    type: TTYPE.TABLE,
                    start: pos,
                    end: pos += cap[0].length,
                    header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
                    align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
                    cells: cap[3].replace(/\n$/, '').split('\n')
                };

                for (i = 0; i < item.align.length; i++) {
                    if (/^ *-+: *$/.test(item.align[i])) {
                        item.align[i] = 'right';
                    } else if (/^ *:-+: *$/.test(item.align[i])) {
                        item.align[i] = 'center';
                    } else if (/^ *:-+ *$/.test(item.align[i])) {
                        item.align[i] = 'left';
                    } else {
                        item.align[i] = null;
                    }
                }

                for (i = 0; i < item.cells.length; i++) {
                    item.cells[i] = item.cells[i].split(/ *\| */);
                }

                this.tokens.push(item);
                continue;
            }

            // lheading
            if (cap = this.rules.lheading.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: TTYPE.HEADING,
                    start: pos,
                    end: pos += cap[0].length,
                    depth: cap[2] === '=' ? 1 : 2,
                    text: cap[1]
                });
                continue;
            }

            // hr
            if (cap = this.rules.hr.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: TTYPE.HR,
                    start: pos,
                    end: pos += cap[0].length,
                });
                continue;
            }

            // blockquote
            if (cap = this.rules.blockquote.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({type: TTYPE.BLOCKQUOTE_START});
                cap = cap[0].replace(/^ *> ?/gm, '');

                // Pass `top` to keep the current
                // "toplevel" state. This is exactly
                // how markdown.pl works.
                this.token(cap, top, true);

                this.tokens.push({
                    type: TTYPE.BLOCKQUOTE_END,
                    start: pos,
                    end: pos += cap[0].length,
                });
                continue;
            }

            // list
            if (cap = this.rules.list.exec(src)) {
                src = src.substring(cap[0].length);
                bull = cap[2];

                this.tokens.push({
                    type: TTYPE.LIST_START,
                    start: pos,
                    end: pos += cap[0].length,
                    ordered: bull.length > 1
                });

                // Get each top-level item.
                cap = cap[0].match(this.rules.item);

                next = false;
                l = cap.length;
                i = 0;

                for (; i < l; i++) {
                    item = cap[i];

                    // Remove the list item's bullet
                    // so it is seen as the next token.
                    space = item.length;
                    item = item.replace(/^ *([*+-]|\d+\.) +/, '');

                    // Outdent whatever the
                    // list item contains. Hacky.
                    if (~item.indexOf('\n ')) {
                        space -= item.length;
                        item = !this.options.pedantic
                            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
                            : item.replace(/^ {1,4}/gm, '');
                    }

                    // Determine whether the next list item belongs here.
                    // Backpedal if it does not belong in this list.
                    if (this.options.smartLists && i !== l - 1) {
                        b = grm.block.bullet.exec(cap[i + 1])[0];
                        if (bull !== b && !(bull.length > 1 && b.length > 1)) {
                            var prepend = cap.slice(i + 1).join('\n');
                            src = prepend + src;
                            pos -= prepend.length;
                            i = l - 1;
                        }
                    }

                    // Determine whether item is loose or not.
                    // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
                    // for discount behavior.
                    loose = next || /\n\n(?!\s*$)/.test(item);
                    if (i !== l - 1) {
                        next = item.charAt(item.length - 1) === '\n';
                        if (!loose) loose = next;
                    }

                    this.tokens.push({type: loose
                        ? TTYPE.LOOSE_ITEM_START
                        : TTYPE.LIST_ITEM_START});

                    // Recurse.
                    this.token(item, false, bq);

                    this.tokens.push({type: loose
                        ? TTYPE.LOOSE_ITEM_END
                        : TTYPE.LIST_ITEM_END});
                }

                this.tokens.push({type: TTYPE.LIST_END});
                continue;
            }

            // html
            if (cap = this.rules.html.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: this.options.sanitize
                        ? TTYPE.PARAGRAPH
                        : TTYPE.HTML,
                    start: pos,
                    end: pos += cap[0].length,
                    pre: !this.options.sanitizer && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
                    text: cap[0],
                });
                continue;
            }

            // def
            if ((!bq && top) && (cap = this.rules.def.exec(src))) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                this.links[cap[1].toLowerCase()] = {href: cap[2], title: cap[3]};
                continue;
            }

            // table (gfm)
            if (top && (cap = this.rules.table.exec(src))) {
                src = src.substring(cap[0].length);

                item = {
                    type: TTYPE.TABLE,
                    start: pos,
                    end: pos += cap[0].length,
                    header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
                    align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
                    cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
                };

                for (i = 0; i < item.align.length; i++) {
                    if (/^ *-+: *$/.test(item.align[i])) {
                        item.align[i] = 'right';
                    } else if (/^ *:-+: *$/.test(item.align[i])) {
                        item.align[i] = 'center';
                    } else if (/^ *:-+ *$/.test(item.align[i])) {
                        item.align[i] = 'left';
                    } else {
                        item.align[i] = null;
                    }
                }

                for (i = 0; i < item.cells.length; i++) {
                    item.cells[i] = item.cells[i].replace(/^ *\| *| *\| *$/g, '').split(/ *\| */);
                }

                this.tokens.push(item);
                continue;
            }

            // top-level paragraph
            if (top && (cap = this.rules.paragraph.exec(src))) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: TTYPE.PARAGRAPH,
                    start: pos,
                    end: pos += cap[0].length,
                    text: cap[1].charAt(cap[1].length - 1) === '\n'
                        ? cap[1].slice(0, -1)
                        : cap[1]
                });
                continue;
            }

            // text
            if (cap = this.rules.text.exec(src)) {
                // Top-level should never reach here.
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: TTYPE.TEXT,
                    start: pos,
                    end: pos += cap[0].length,
                    text: cap[0]
                });
                continue;
            }

            if (src) throw Error('Infinite loop: ' + src);
        }
    }
}


// Inline Lexer & COMPILER
export class InlineLexer {
    links;

    options: IOptions;

    ast: Ast;

    inLink: boolean;

    rules = grm.inline.normal;

    constructor(links, options, ast) {
        this.links = links;
        this.options = options;
        this.ast = ast;

        var inline = grm.inline;
        if (this.options.gfm) {
            if (this.options.breaks) this.rules = inline.breaks;
            else this.rules = inline.gfm;
        } else if (this.options.pedantic)
            this.rules = inline.pedantic;
    }

    /**
     * @param src
     * @param pos Offset of this inline chunk in global Markdown string.
     * @returns {Array}
     */
    output(src, pos = 0) {
        var out = [], link, text, href, cap, options = this.options;

        var loop = () => {
            if(!src) {

                return;
            }

            // escape
            if (cap = this.rules.escape.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(cap[1]);
                continue;
            }

            // autolink
            if (cap = this.rules.autolink.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                if (cap[2] === '@') {
                    text = cap[1].charAt(6) === ':'
                        ? this.mangle(cap[1].substring(7))
                        : this.mangle(cap[1]);
                    href = this.mangle('mailto:') + text;
                } else {
                    text = escape(cap[1]);
                    href = text;
                }
                out.push(this.ast.link(href, null, text));
                continue;
            }

            // url (gfm)
            if (!this.inLink && (cap = this.rules.url.exec(src))) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                text = escape(cap[1]);
                href = text;
                out.push(this.ast.link(href, null, text));
                continue;
            }

            // tag
            if (cap = this.rules.tag.exec(src)) {
                if (!this.inLink && /^<a /i.test(cap[0])) {
                    this.inLink = true;
                } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
                    this.inLink = false;
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

            // link
            if (cap = this.rules.link.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                this.inLink = true;
                out.push(this.outputLink(cap, {
                    href: cap[2],
                    title: cap[3]
                }));
                this.inLink = false;
                continue;
            }

            // reflink, nolink
            if ((cap = this.rules.reflink.exec(src))
                || (cap = this.rules.nolink.exec(src))) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
                link = this.links[link.toLowerCase()];
                if (!link || !link.href) {
                    out.push(cap[0].charAt(0));
                    var prepend = cap[0].substring(1);
                    src = prepend + src;
                    pos -= prepend.length;
                    continue;
                }
                this.inLink = true;
                out.push(this.outputLink(cap, link));
                this.inLink = false;
                continue;
            }

            // strong
            if (cap = this.rules.strong.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(this.ast.strong(this.output(cap[2] || cap[1])));
                continue;
            }

            // em
            if (cap = this.rules.em.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(this.ast.em(this.output(cap[2] || cap[1])));
                continue;
            }

            // code
            if (cap = this.rules.code.exec(src)) {
                src = src.substring(cap[0].length);
                out.push(this.ast.codespan({
                    start: pos,
                    end: pos += cap[0].length,
                    text: escape(cap[2], true),
                }));
                continue;
            }

            // br
            if (cap = this.rules.br.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(this.ast.br());
                continue;
            }

            // del (gfm)
            if (cap = this.rules.del.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(this.ast.del(this.output(cap[1])));
                continue;
            }

            // text
            if (cap = this.rules.text.exec(src)) {
                src = src.substring(cap[0].length);
                pos += cap[0].length;
                out.push(this.ast.text(escape(this.smartypants(cap[0]))));
                continue;
            }

            if (src) throw Error('Infinite loop: ' + src);
        };
        loop();

        return out;
    }

    outputLink(cap, link) {
        var href = escape(link.href), title = link.title ? escape(link.title) : null;

        return cap[0].charAt(0) !== '!'
            ? this.ast.link(href, title, this.output(cap[1]))
            : this.ast.image(href, title, escape(cap[1]));
    }

    smartypants(text: string): string {
        if (!this.options.smartypants) return text;
        return text
            .replace(/---/g, '\u2014')                              // em-dashes
            .replace(/--/g, '\u2013')                               // en-dashes
            .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')         // opening singles
            .replace(/'/g, '\u2019')                                // closing singles & apostrophes
            .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')    // opening doubles
            .replace(/"/g, '\u201d')                                // closing doubles
            .replace(/\.{3}/g, '\u2026');                           // ellipses
    }

    // Mangle Links
    mangle(text) {
        if (!this.options.mangle) return text;
        var out = '', l = text.length, i = 0, ch;
        for (; i < l; i++) {
            ch = text.charCodeAt(i);
            if (Math.random() > 0.5) ch = 'x' + ch.toString(16);
            out += '&#' + ch + ';';
        }
        return out;
    }
}


export class Ast {
    options: IOptions;

    constructor(options) {
        this.options = options;
    }

    addNodeMeta(token, attr) {
        if(this.options.attrMeta) {
            attr = attr || {};
            attr[this.options.attrMeta] = token.start + ',' + token.end;
        }
        return attr;
    }

    code(token, cb) {
        var {text, lang, escaped} = token;
        var attr = null;
        if(lang) {
            attr = {[this.options.attrClass]: 'lang-' + escape(lang, true)};
        }
        cb(
            ['pre', attr,
                ['code', null,
                    escaped ? text : escape(text, true)
                ]
            ]
        );
    }

    blockquote(body) {
        return ['blockquote', null, ...body];
    }

    html(html) {
        return html;
    }

    heading(token: IToken, body) {
        var attr = {id: 'header-' + token.text.toLowerCase().replace(/[^\w]+/g, '-')};
        attr = this.addNodeMeta(token, attr);
        return ['h' + token.depth, attr, ...body];
    }

    hr() {
        return ['hr'];
    }

    list(body, ordered) {
        var type = ordered ? 'ol' : 'ul';
        return [type, null].concat(body);
    }

    listitem(body) {
        return ['li', null, ...body];
    }

    paragraph(token, body) {
        return ['p', this.addNodeMeta(token, null), ...body];
    }

    table(header, body) {
        return ['table', null,
            ['thead', null, ...header],
            ['tbody', null, ...body],
        ];
    }

    tablerow(content) {
        return ['tr', null, ...content];
    }

    tablecell(content, flags) {
        var type = flags.header ? 'th' : 'td';
        var attr = flags.align
            ? {style: 'text-align:' + flags.align}
            : null;
        return [type, attr, ...content];
    }


    // span level renderer
    strong(body) {
        return ['strong', null, ...body];
    }

    em(body) {
        return ['em', null, ...body];
    }

    codespan(token, cb) {
        cb(['code', this.addNodeMeta(token, null), token.text]);
    }

    br() {
        return ['br', null];
    }

    del(body) {
        return ['del', null, ...body];
    }

    link(href, title, text) {
        if (this.options.sanitize) {
            try {
                var prot = decodeURIComponent(unescape(href))
                    .replace(/[^\w:]/g, '')
                    .toLowerCase();
            } catch (e) {
                href = '#xss';
            }
            if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
                href = '#xss';
            }
        }
        var attr: any = {href: href};
        if (title) attr.title = title;
        return ['a', attr, ...text];
    }

    image(href, title, text) {
        var attr: any = {src: href, alt: text};
        if (title) attr.title = title;
        return ['img', attr];
    }

    text(text) {
        return text;
    }
}


export class Parser {

    tokens;

    token = null;

    options: IOptions;

    ast: Ast;

    inline;

    constructor(options = {}) {
        this.options = merge({}, defaults, options);
        this.ast = this.options.ast = this.options.ast || new Ast(this.options);
    }

    // Parse Loop
    parse(blexer: BlockLexer, done) {
        this.inline = new InlineLexer(blexer.links, this.options, this.ast);
        this.tokens = blexer.tokens.reverse();

        console.log(this.tokens);

        var out = ['div', null];
        var loop = () => {
            if(this.next()) {
                this.tok((el) => {
                    out.push(el);
                    loop();
                });
            } else done(out);
        };
        loop();
    }

    // Next Token
    next() {
        return this.token = this.tokens.pop();
        // console.log(this.token);
        // return this.token;
    }

    // Preview Next Token
    peek() {
        return this.tokens[this.tokens.length - 1] || 0;
    }

    // Parse Text Tokens
    parseText(cb) {
        var token = this.token;
        var text = token.text;
        var pos = token.start;

        while (this.peek().type === TTYPE.TEXT)
            text += '\n' + this.next().text;
        cb(this.inline.output(text, pos));
    }

    // Parse Current Token
    tok(cb) {
        var token = this.token, ast = this.ast, inline = this.inline;
        switch(token.type) {
            case TTYPE.SPACE:       return cb(null);
            case TTYPE.HR:          return cb(ast.hr());
            case TTYPE.PARAGRAPH:
                return cb(ast.paragraph(token, inline.output(token.text, token.start)));
            case TTYPE.TEXT: {
                return this.parseText((text) => {
                    cb(ast.paragraph(token, text))
                });
            }
            case TTYPE.HEADING:
                return cb(ast.heading(token, inline.output(token.text, token.start + token.offset)));
            case TTYPE.CODE: {
                return ast.code(token, cb);
            }
            case TTYPE.TABLE: {
                var header = [], body = [], i, row, cell, flags, j;

                // header
                cell = [];
                for (i = 0; i < token.header.length; i++) {
                    flags = { header: true, align: token.align[i] };
                    cell.push(ast.tablecell(this.inline.output(token.header[i]), {header: true, align: token.align[i]}));
                }
                header.push(ast.tablerow(cell));

                for (i = 0; i < token.cells.length; i++) {
                    row = token.cells[i];

                    cell = [];
                    for (j = 0; j < row.length; j++) {
                        cell.push(ast.tablecell(
                            this.inline.output(row[j]),
                            { header: false, align: token.align[j] }
                        ));
                    }

                    body.push(ast.tablerow(cell));
                }
                return cb(ast.table(header, body));
            }
            case TTYPE.BLOCKQUOTE_START: {
                var body = [];
                var loop = () => {
                    if(this.next().type !== TTYPE.BLOCKQUOTE_END) {
                        this.tok((el) => {
                            body.push(el);
                            loop();
                        });
                    } else cb(ast.blockquote(body));
                };
                return loop();
            }
            case TTYPE.LIST_START: {
                var body = [];
                var loop = () => {
                    if(this.next().type !== TTYPE.LIST_END) {
                        this.tok((el) => {
                            body.push(el);
                            loop();
                        });
                    } else cb(ast.list(body, token.ordered));
                };
                return loop();
            }
            case TTYPE.LIST_ITEM_START: {
                var body = [];
                var loop = () => {
                    var next = this.next();
                    if(next.type !== TTYPE.LIST_ITEM_END) {
                        if(next.type === TTYPE.TEXT) {
                            this.parseText((list) => {
                                body = body.concat(list);
                                loop();
                            });
                        } else {
                            this.tok((el) => {
                                body.push(el);
                                loop();
                            });
                        }

                    } else cb(ast.listitem(body));
                };
                return loop();
            }
            case TTYPE.LOOSE_ITEM_START: {
                var body = [];
                var loop = () => {
                    if(this.next().type !== TTYPE.LOOSE_ITEM_END) {
                        this.tok((el) => {
                            body.push(el);
                            loop();
                        });
                    } else cb(ast.listitem(body));
                };
                return loop();
            }
            case TTYPE.HTML: {
                var html = !this.token.pre && !this.options.pedantic
                    ? this.inline.output(this.token.text)
                    : this.token.text;
                return cb(ast.html(html));
            }
        }
    }
}


export function parse(src, opt = {}, done) {
    if (opt) opt = merge({}, defaults, opt);
    var lexer = new BlockLexer(opt);
    lexer.lex(src);
    var parser = new Parser(opt);
    return parser.parse(lexer, done);
}
