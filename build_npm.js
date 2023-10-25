import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

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
  shims: {
    deno: true,
  },
  package: {
    name: "drop-inline-css",
    version: "0.2.0",
    description: "Parse HTML and drop unused CSS, inline it to HTML.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/marmooo/drop-inline-css/repo.git",
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
