import * as md from './index';
import * as util from 'util';
import * as desigual from '../desigual';
var jslang = require('../desigual/lang/javascript');
import {dom} from '../jml-h';


class HlAst extends md.Ast {

    code(token, cb) {
        var {text, lang, escaped} = token;
        var tokens = desigual.tok(text, jslang);
        var jml = desigual.jml(text, tokens, 'class', 'hl-', 'span', true);
        cb(['code', null].concat(jml));
    }

}


function log(obj) {
    console.log(util.inspect(obj, {depth: 10, colors: true}));
}


var src = '# Hello\n\n' +
    '    console.log(123);\n\n' +
    '';


md.parse(src, {
    ast: new HlAst({}),
}, (jml) => {
    log(jml);
    console.log(dom(jml));
});
