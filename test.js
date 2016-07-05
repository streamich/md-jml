var util = require('util');
var parse = require('./index').parse;


var md =
    '# Hello <kbd>World</kbd>\n\n' +

    ' - List *item* 1 \n' +
    ' - List item 2 \n\n' +

    'This is a paragraph. Testing `inline code`.\n\n' +
    'This is <script>alert("xss");</script> attack.\n\n' +

    '> This is quote. \n\n' +
    '[Tro*lo*lo](#link).\n\n' +
    '    console.log(123);\n\n' +
    'Some ~~text~~.\n\n' +
    'Some ~~*text*~~.\n\n' +
    'Some *`code`*.\n\n' +
    'Some *italics*.\n\n' +
    'Some **bold**.\n\n' +
    'Some <b>bold</b> or <script>alert(xss);</script>.\n\n' +
    '| Tables        | Are           | Cool  |\n' +
    '| ------------- |:-------------:| -----:|\n' +
    '| col 3 is      | right-aligned | $1600 |\n\n' +
    '';
var out = parse(md);
console.log(util.inspect(out, {depth: 10, colors: true}));


var lib = require("../jml-h/index");
console.log(lib.dom(out));


console.log(parse('I am using __markdown__.'));
