const fs = require("fs");
const path = require("path");
const URL = require("url").URL;
const glob = require("glob");
const fetch = require("node-fetch");
const dropcss = require("dropcss");
const lightningcss = require("lightningcss");
const htmlparser = require("node-html-parser");
const { Command } = require("commander");
const packageJson = require("../package.json");

const program = new Command();
program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version);
program
  .argument("[input]", "Path of HTML file/direcotry")
  .option("-c, --css [path]", "CSS path for inlining in HTML")
  .option("-o, --output [path]", "Output path of HTML file/directory")
  .option("-r, --recursive", "Recursively inline directories")
  .option("-i, --show-inline-css", "Show inline CSS");
program.parse();

function getDroppedCss(css, html) {
  const dropped = dropcss({
    css,
    html,
    shouldDrop: () => {
      return true;
    },
  });
  return dropped.css;
}

async function getCss(url) {
  try {
    new URL(url);
    const response = await fetch(url)
      .then((response) => {
        if (!response.ok) throw Error(response.statusText);
        return response;
      })
      .catch((err) => {
        console.error(err);
      });
    const css = await response.text();
    return css;
  } catch {
    if (url.startsWith("/")) {
      return fs.readFileSync("." + url).toString();
    } else {
      return fs.readFileSync(url).toString();
    }
  }
}

async function getAllCss(urls) {
  const promises = urls.map((url) => {
    return new Promise((resolve) => {
      const css = getCss(url);
      resolve(css);
    });
  });
  return await Promise.all(promises);
}

function getReplacerLink(url) {
  return `
    <link rel="stylesheet" href="${url}"
      media="print" onload="this.media='all';this.onload=null;">
  `;
}

function getInlinedCss(css, html) {
  const droppedCss = getDroppedCss(css, html);
  const minifiedCss = lightningcss.transform({
    filename: "",
    code: Buffer.from(droppedCss),
    minify: true,
  });
  return minifiedCss.code.toString();
}

async function getInlinedHtml(html, inlineCss, options = {}) {
  const root = htmlparser.parse(html);
  const selector = "head > link[href][rel=stylesheet]:not([media=print])";
  const cssLinks = root.querySelectorAll(selector);
  if (cssLinks.length > 0) {
    const urls = cssLinks.map((cssLink) => cssLink._attrs.href);
    if (!inlineCss) {
      const css = await getAllCss(urls);
      inlineCss = getInlinedCss(css.join("\n"), html);
      if (options.showInlineCss) console.log(inlineCss);
    }
    cssLinks[0].insertAdjacentHTML(
      "beforebegin",
      `<style>${inlineCss}</style>`,
    );
    cssLinks.forEach((cssLink, i) => {
      const replacerLink = getReplacerLink(urls[i]);
      cssLinks[i].insertAdjacentHTML("afterend", replacerLink);
      cssLink.remove();
    });
    return root.toString();
  } else {
    return html;
  }
}

function output(inlinedHtml, outputPath, options, isFile) {
  if (isFile) {
    if (options.output) {
      fs.writeFileSync(options.output, inlinedHtml);
    } else if (!options.showInlineCss) {
      console.log(inlinedHtml);
    }
  } else {
    if (options.output) {
      fs.writeFileSync(outputPath, inlinedHtml);
    } else {
      console.error("ERROR: need -o [dir] / --output [dir]");
    }
  }
}

function globHtml(dir, recursive) {
  const s = path.sep;
  if (recursive) {
    return glob.sync(dir + `${s}**${s}*.htm?(l)`);
  } else {
    return glob.sync(dir + `${s}*.htm?(l)`);
  }
}

function mkUpperDirSync(filePath) {
  const fileName = path.basename(filePath);
  const innerDir = filePath.slice(0, -fileName.length);
  fs.mkdirSync(innerDir, { recursive: true });
}

async function dropInlineCssDir(dirPath, options) {
  fs.mkdirSync(dirPath, { recursive: true });
  if (dirPath.at(-1) != path.sep) {
    dirPath += path.sep;
  }
  const filePaths = globHtml(dirPath, options.recursive);
  if (options.css) {
    const inlineCss = fs.readFileSync(options.css).toString();
    for (const filePath of filePaths) {
      console.info(filePath);
      const outputPath = options.output + path.sep +
        filePath.slice(dirPath.length);
      mkUpperDirSync(outputPath);
      const html = fs.readFileSync(filePath).toString();
      const inlinedHtml = await getInlinedHtml(html, inlineCss);
      output(inlinedHtml, outputPath, options, false);
    }
  } else {
    for (const filePath of filePaths) {
      console.info(filePath);
      const outputPath = options.output + path.sep +
        filePath.slice(dirPath.length);
      mkUpperDirSync(outputPath);
      const html = fs.readFileSync(filePath).toString();
      const inlinedHtml = await getInlinedHtml(html);
      output(inlinedHtml, outputPath, options, false);
    }
  }
}

async function dropInlineCssFile(filePath, options) {
  const html = fs.readFileSync(filePath).toString();
  if (options.css) {
    const inlineCss = fs.readFileSync(options.css).toString();
    const inlinedHtml = await getInlinedHtml(html, inlineCss, options);
    output(inlinedHtml, filePath, options, true);
  } else {
    const inlinedHtml = await getInlinedHtml(html, undefined, options);
    output(inlinedHtml, filePath, options, true);
  }
}

async function dropInlineCss() {
  const targetPath = program.args[0];
  const options = program.opts();
  if (fs.existsSync(targetPath)) {
    if (fs.lstatSync(targetPath).isFile()) {
      await dropInlineCssFile(targetPath, options);
    } else {
      if (options.showInlineCss) {
        console.error("ERROR: -i / --show-inline-css works only file");
      } else {
        await dropInlineCssDir(targetPath, options);
      }
    }
  } else {
    console.error("ERROR: input path is illegal");
  }
}

module.exports = dropInlineCss;
