import { Command } from "npm:commander@11.1.0";
import { dropInlineCss } from "./mod.js";

const program = new Command();
program
  .name("drop-inline-css")
  .description("Parse HTML and drop unused CSS, inline it to HTML.")
  .version("0.1.8");
program
  .argument("[input]", "Path of HTML file/direcotry")
  .option("-c, --css [path]", "CSS path for inlining in HTML")
  .option("-o, --output [path]", "Output path of HTML file/directory")
  .option("-r, --recursive", "Recursively inline directories")
  .option("-i, --show-inline-css", "Show inline CSS")
  .option("-h, --href [href]", "Path of original file");
program.parse();

const targetPath = program.args[0];
const options = program.opts();
dropInlineCss(targetPath, options);
