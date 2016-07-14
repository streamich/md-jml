# `md-jml`

Markdown to JsonML parser. This is a port of [`marked`](https://github.com/chjj/marked) to TypeScript.

Differences:

 - Outputs JsonML AST instead of an HTML string.
 - Written in TypeScript.
 - Does not support highlighting functionality of `marked`, as it is better
 to do it by extending the `Ast` constructor function (a.k.a. `Renderer` in `marked`) or
 by traversing the resulting JsonML tree.
 - Asynchronous AST generation.
 - Not tested.
 
Unlike other Markdown parsers this module returns a JsonML AST of the resulting
HTML instead of just an HTML string.

You can use that JsonML to easily concatenate it to an HTML string or
feed the JsonML to a virtual DOM rendering engine, like `React.js`, `Mithril.js`, `virtual-dom`, etc...

Using `marked` you get an HTML string:

```js
var marked = require('marked');
console.log(marked('I am using __markdown__.'));
// <p>I am using <strong>markdown</strong>.</p>
```

However, `md-jml` returns a JsonML tree:

```js
var md = require('md-jml');
md.parse('I am using __markdown__.', {}, function(jml) {
    console.log(jml);
});

// [ 'div',
//     [ 'p', null,
//         'I am using ',
//         [ 'strong', null, 'markdown' ],
//         '.'
//     ]
// ]
```

You can use the resulting JsonML to generate HTML using the [`jml-h`](http://www.npmjs.com/package/jml-h) package:

```js
var jmlh = require('jml-h');
var html = jmlh.dom(jml);
console.log(html);
// <div><p>I am using <strong>markdown</strong>.</p></div>
```
