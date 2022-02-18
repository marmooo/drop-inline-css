# drop-inline-css

Parse HTML and drop unused CSS, inline it to HTML.

## Install

```
npm install drop-inline-css -g
```

## Usage

```
Usage: drop-inline-css [options] [input]

Parse HTML and drop unused CSS, inline it to HTML.

Arguments:
  input                Path of HTML file/direcotry

Options:
  -V, --version        output the version number
  -c, --css [path]     CSS for inlining in HTML
  -o, --output [path]  Output path of HTML file/directory
  -r, --recursive      Recursively inline directories
  -h, --help           display help for command
```

## Examples

```
drop-inline-css input.html > inlined.html
drop-inline-css input.html -c inline.css > inlined.html
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
  </body>
</html>
```

## License

MIT
