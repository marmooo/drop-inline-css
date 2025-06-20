import { basename, resolve, SEPARATOR } from "@std/path";
import { expandGlobSync } from "@std/fs";
// import dropcss from "npm:dropcss@1.0.16";
import { PurgeCSS } from "purgecss";
import { transform } from "lightningcss";
import { parse } from "node-html-parser";

async function getCss(url) {
  try {
    new URL(url);
    const response = await fetch(url);
    const css = await response.text();
    return css;
  } catch {
    if (url.startsWith("/")) {
      return Deno.readTextFileSync("." + url).toString();
    } else {
      return Deno.readTextFileSync(url).toString();
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

async function dropCss(css, html) {
  // const dropped = dropcss({
  //   css,
  //   html,
  //   shouldDrop: () => {
  //     return true;
  //   },
  // });
  // const droppedCss = dropped.css;
  const config = {
    content: [{
      raw: html,
      extension: "html",
    }],
    css: [{
      raw: css,
    }],
  };
  const purged = await new PurgeCSS().purge(config);
  const droppedCss = purged[0].css;

  const minified = transform({
    filename: "",
    code: new TextEncoder().encode(droppedCss),
    minify: true,
  });
  return new TextDecoder().decode(minified.code);
}

async function inlineHtml(doc) {
  const linkSelector = "link[href][rel=stylesheet][class=inline-css]";
  const cssLinks = doc.querySelectorAll(linkSelector);
  for (const cssLink of cssLinks) {
    const url = cssLink._attrs.href;
    const css = await getCss(url);
    cssLinks[0].insertAdjacentHTML("beforebegin", `<style>${css}</style>`);
    cssLink.remove();
  }
  return doc;
}

async function dropInlineHtml(doc, css, options) {
  const head = doc.querySelector("head");
  if (head) {
    await dropInlineHtmlBySelector(head, doc, css, options);
  }
  for (const template of doc.querySelectorAll("template")) {
    await dropInlineHtmlBySelector(template, doc, css, options);
  }
  return doc;
}

async function dropInlineHtmlBySelector(root, doc, css, options = {}) {
  const linkSelector = "link[href][rel=stylesheet][class=drop-inline-css]";
  const cssLinks = root.querySelectorAll(linkSelector);
  if (cssLinks.length == 0) return doc;
  const urls = cssLinks.map((cssLink) => cssLink._attrs.href);
  if (!css) {
    const allCss = await getAllCss(urls);
    css = await dropCss(allCss.join("\n"), doc.toString());
  }
  if (options.showDroppedCss) console.log(css);
  cssLinks[0].insertAdjacentHTML("beforebegin", `<style>${css}</style>`);
  cssLinks.forEach((cssLink) => cssLink.remove());
  return doc;
}

function output(doc, outputPath, options, isFile) {
  const inlinedHtml = doc.toString();
  if (isFile) {
    if (options.output) {
      Deno.writeTextFileSync(options.output, inlinedHtml);
    } else if (!options.showDroppedCss) {
      console.log(inlinedHtml);
    }
  } else {
    if (options.output) {
      Deno.writeTextFileSync(outputPath, inlinedHtml);
    } else {
      console.error("ERROR: need -o [dir] / --output [dir]");
    }
  }
}

function globHtml(dir, recursive) {
  if (recursive) {
    return expandGlobSync(dir + `${SEPARATOR}**${SEPARATOR}*.htm?(l)`);
  } else {
    return expandGlobSync(dir + `${SEPARATOR}*.htm?(l)`);
  }
}

function mkUpperDirSync(filePath) {
  const fileName = basename(filePath);
  const innerDir = filePath.slice(0, -fileName.length);
  Deno.mkdirSync(innerDir, { recursive: true });
}

async function dropInlineCssDir(dirPath, options) {
  Deno.mkdirSync(dirPath, { recursive: true });
  dirPath = resolve(dirPath);
  const files = globHtml(dirPath, options.recursive);
  if (options.css) {
    const css = Deno.readTextFileSync(options.css).toString();
    for (const file of files) {
      console.info(file.path);
      const outputPath = options.output + SEPARATOR +
        file.path.slice(dirPath.length);
      mkUpperDirSync(outputPath);
      const html = Deno.readTextFileSync(file.path).toString();
      const doc = parse(html);
      await inlineHtml(doc);
      await dropInlineHtml(doc, css, options);
      output(doc, outputPath, options, false);
    }
  } else {
    for (const file of files) {
      console.info(file.path);
      const outputPath = options.output + SEPARATOR +
        file.path.slice(dirPath.length);
      mkUpperDirSync(outputPath);
      const html = Deno.readTextFileSync(file.path).toString();
      const doc = parse(html);
      await inlineHtml(doc);
      await dropInlineHtml(doc, undefined, options);
      output(doc, outputPath, options, false);
    }
  }
}

async function dropInlineCssFile(filePath, options) {
  const html = Deno.readTextFileSync(filePath).toString();
  const doc = parse(html);
  if (options.css) {
    const css = Deno.readTextFileSync(options.css).toString();
    await inlineHtml(doc);
    await dropInlineHtml(doc, css, options);
    output(doc, filePath, options, true);
  } else {
    await inlineHtml(doc);
    dropInlineHtml(doc, undefined, options);
    output(doc, filePath, options, true);
  }
}

export async function dropInlineCss(targetPath, options = {}) {
  try {
    const fileInfo = Deno.statSync(targetPath);
    if (fileInfo.isFile) {
      await dropInlineCssFile(targetPath, options);
    } else {
      if (options.showDroppedCss) {
        console.error("ERROR: -i / --show-inline-css works only file");
      } else {
        await dropInlineCssDir(targetPath, options);
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error("ERROR: input path is illegal");
    } else {
      console.log(error);
    }
  }
}
