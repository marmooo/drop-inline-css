import { SEPARATOR } from "https://deno.land/std/path/constants.ts";
import { basename, resolve } from "https://deno.land/std/path/mod.ts";
import { expandGlobSync } from "https://deno.land/std/fs/expand_glob.ts";
// import dropcss from "npm:dropcss@1.0.16";
import { PurgeCSS } from "npm:purgecss@5.0.0";
import { transform } from "npm:lightningcss@1.23.0";
import { parse } from "npm:node-html-parser@6.1.12";

async function getDroppedCss(css, html) {
  // const dropped = dropcss({
  //   css,
  //   html,
  //   shouldDrop: () => {
  //     return true;
  //   },
  // });
  // return dropped.css;
  const config = {
    content: [{
      raw: html,
      extension: "html",
    }],
    css: [{
      raw: css,
    }],
  };
  const result = await new PurgeCSS().purge(config);
  return result[0].css;
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

function getReplacerLink(url) {
  return `
    <link rel="stylesheet" href="${url}"
      media="print" onload="this.media='all';this.onload=null;">
  `;
}

async function getInlinedCss(css, html) {
  const droppedCss = await getDroppedCss(css, html);
  const minified = transform({
    filename: "",
    code: new TextEncoder().encode(droppedCss),
    minify: true,
  });
  return new TextDecoder().decode(minified.code);
}

async function getInlinedHtml(html, inlineCss, options = {}) {
  const root = parse(html);
  const selector = "head > link[href][rel=stylesheet]:not([media=print])";
  const cssLinks = root.querySelectorAll(selector);
  if (cssLinks.length > 0) {
    const urls = cssLinks.map((cssLink) => cssLink._attrs.href);
    if (!inlineCss) {
      const css = await getAllCss(urls);
      inlineCss = await getInlinedCss(css.join("\n"), html);
      if (options.showInlineCss) console.log(inlineCss);
    }
    cssLinks[0].insertAdjacentHTML(
      "beforebegin",
      `<style>${inlineCss}</style>`,
    );
    cssLinks.forEach((cssLink, i) => {
      switch (options.href) {
        case undefined:
          break;
        case true: {
          const replacerLink = getReplacerLink(urls[i]);
          cssLinks[i].insertAdjacentHTML("afterend", replacerLink);
          break;
        }
        default: {
          const replacerLink = getReplacerLink(options.href);
          cssLinks[i].insertAdjacentHTML("afterend", replacerLink);
          break;
        }
      }
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
      Deno.writeTextFileSync(options.output, inlinedHtml);
    } else if (!options.showInlineCss) {
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
    const inlineCss = Deno.readTextFileSync(options.css).toString();
    for (const file of files) {
      console.info(file.path);
      const outputPath = options.output + SEPARATOR +
        file.path.slice(dirPath.length);
      mkUpperDirSync(outputPath);
      const html = Deno.readTextFileSync(file.path).toString();
      const inlinedHtml = await getInlinedHtml(html, inlineCss, options);
      output(inlinedHtml, outputPath, options, false);
    }
  } else {
    for (const file of files) {
      console.info(file.path);
      const outputPath = options.output + SEPARATOR +
        file.path.slice(dirPath.length);
      mkUpperDirSync(outputPath);
      const html = Deno.readTextFileSync(file.path).toString();
      const inlinedHtml = await getInlinedHtml(html, undefined, options);
      output(inlinedHtml, outputPath, options, false);
    }
  }
}

async function dropInlineCssFile(filePath, options) {
  const html = Deno.readTextFileSync(filePath).toString();
  if (options.css) {
    const inlineCss = Deno.readTextFileSync(options.css).toString();
    const inlinedHtml = await getInlinedHtml(html, inlineCss, options);
    output(inlinedHtml, filePath, options, true);
  } else {
    const inlinedHtml = await getInlinedHtml(html, undefined, options);
    output(inlinedHtml, filePath, options, true);
  }
}

export async function dropInlineCss(targetPath, options = {}) {
  try {
    const fileInfo = Deno.statSync(targetPath);
    if (fileInfo.isFile) {
      await dropInlineCssFile(targetPath, options);
    } else {
      if (options.showInlineCss) {
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
