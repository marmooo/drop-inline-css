# drop-inline-css

Parse HTML and drop unused CSS, inline it to HTML.

## Installation

```
npm install drop-inline-css -g
```

## Usage

### Node.js

```
const dropInlineCss = require("./src/drop-inline-css.js");

async function build() {
  await dropInlineCss("test.html"); // -> stdout
  const result = await dropInlineCss("test.html", {
    output: "test.min.html"
  });
}

build();
```

### CLI

```
Usage: drop-inline-css [options] [input]

Parse HTML and drop unused CSS, inline it to HTML.

Arguments:
  input                Path of HTML file/direcotry

Options:
  -V, --version          output the version number
  -c, --css [path]       CSS path for inlining in HTML
  -o, --output [path]    Output path of HTML file/directory
  -r, --recursive        Recursively inline directories
  -i, --show-inline-css  Show inline CSS
  -h, --help             display help for command
```

### Examples

```
drop-inline-css input.html > inlined.html
drop-inline-css -i input.html > inline.css
drop-inline-css input.html -c inline.css > inlined.html
drop-inline-css -r src -o docs
drop-inline-css -r src -o docs -c inline.css
```

`input.html`

```html
<html>
  <head>
    <link rel="stylesheet" href="style.css"></link>
  </head>
  <body>
    <p>styled</p>
  </body>
</html>
```

`inline.css` or `style.css`

```css
p { text-decoration: underline; } /* used -> inline */
span { font-size: 1rem; }  /* unused -> drop */
```

`inlined.html`

```html
<html>
  <head>
    <style>p { text-decoration: underline; }</style>
    <link rel="stylesheet" href="style.css"
      media="print" onload="this.media='all';this.onload=null;">
  </head>
  <body>
    <p>styled</p>
  </body>
</html>
```

## License

MIT
