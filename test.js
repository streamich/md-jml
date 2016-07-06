var util = require('util');
var parse = require('./index').parse;


var md =
    '# [Hello](http://google.com) <kbd>World</kbd>\n\n' +

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

md = '# Hello `There` 2' + '\n\n' +
    'You are you?' + '\n\n' +
    ' - list;' + '\n\n' +
    'asdf' + '\n\n' +
    '    console.log;' + '\n\n' +
    'Test `this` [lololo](http://google.com).' + '\n\n' +
    'asdfafd';

md = 'Text:\n\n' +
    ' - list\n\n' +
    '```js\n' +
    '    console.log(123);\n' +
    '```\n';


console.log(md);
parse(md, {}, function(out) {
    console.log(util.inspect(out, {depth: 10, colors: true}));
});



// var lib = require("../jml-h/index");
// console.log(lib.dom(out));
// console.log(parse('I am using __markdown__.'));
