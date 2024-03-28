# drop-inline-css

Parse HTML and drop unused CSS, inline it to HTML.

## Installation

### Deno

```
deno install -fr -A --name drop-inline-css \
https://raw.githubusercontent.com/marmooo/drop-inline-css/main/cli.js
```

### Node

```
npm install drop-inline-css -g
```

## Usage

```
import { dropInlineCss } from "drop-inline-css";

async function build() {
  await dropInlineCss("test.html"); // -> stdout
  const result = await dropInlineCss("test.html", {
    output: "test.min.html",
  });
}

build();
```

### CLI

```
Usage: drop-inline-css [options] [input]

Parse HTML and drop unused CSS, inline it to HTML.

Arguments:
  input                   Path of HTML file/direcotry

Options:
  -V, --version           output the version number
  -c, --css [path]        CSS path for inlining in HTML
  -o, --output [path]     Output path of HTML file/directory
  -r, --recursive         Recursively inline directories
  -d, --show-dropped-css  Show dropped CSS one line per head/template node
  -h, --help              display help for command
```

### Examples

```
drop-inline-css input.html > inlined.html
drop-inline-css input.html > inlined.html
drop-inline-css -d input.html > dropped.css
drop-inline-css input.html --css dropped.css > inlined.html
drop-inline-css -r src -o docs
drop-inline-css -r src -o docs -c inline.css
```

`input.html`

```html
<html>
  <head>
    <!-- optimization behavior changes depending on class name
      "drop-inline-css": remove unused properties from CSS file and inline them
      "inline-css": inline the contents of CSS file as is
    -->
    <link class="drop-inline-css" rel="stylesheet" href="inefficient.css"></link>
    <link class="inline-css" rel="stylesheet" href="efficient.css"></link>
    <link rel="stylesheet" href="keep.css"></link>
  </head>
  <body>
    <p>styled</p>
  </body>
</html>
```

`inefficient.css`

```css
p { text-decoration: underline; } /* used -> inline */
span { font-size: 1rem; }  /* unused -> drop */
```

`efficient.css`

```css
pre { color: red; }
```

`inlined1.html`

```html
<html>
  <head>
    <style>p { text-decoration: underline; }</style>
    <style>pre { color: red; }</style>
    <link rel="stylesheet" href="keep.css"></link>
  </head>
  <body>
    <p>styled</p>
  </body>
</html>
```

## License

MIT
