import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");

await build({
  entryPoints: [
    "./mod.js",
    {
      kind: "bin",
      name: "drop-inline-css",
      path: "./cli.js",
    },
  ],
  outDir: "./npm",
  typeCheck: false,
  shims: {
    deno: true,
  },
  package: {
    name: "drop-inline-css",
    version: "0.3.6",
    description: "Parse HTML and drop unused CSS, inline it to HTML.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/marmooo/drop-inline-css.git",
    },
    bugs: {
      url: "https://github.com/marmooo/drop-inline-css/issues",
    },
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
