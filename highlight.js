"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var md = require('./index');
var util = require('util');
var desigual = require('../desigual');
var jslang = require('../desigual/lang/javascript');
var jml_h_1 = require('../jml-h');
var HlAst = (function (_super) {
    __extends(HlAst, _super);
    function HlAst() {
        _super.apply(this, arguments);
    }
    HlAst.prototype.code = function (token, cb) {
        var text = token.text, lang = token.lang, escaped = token.escaped;
        var tokens = desigual.tok(text, jslang);
        var jml = desigual.jml(text, tokens, 'class', 'hl-', 'span', true);
        cb(['code', null].concat(jml));
    };
    return HlAst;
}(md.Ast));
function log(obj) {
    console.log(util.inspect(obj, { depth: 10, colors: true }));
}
var src = '# Hello\n\n' +
    '    console.log(123);\n\n' +
    '';
md.parse(src, {
    ast: new HlAst({})
}, function (jml) {
    log(jml);
    console.log(jml_h_1.dom(jml));
});
