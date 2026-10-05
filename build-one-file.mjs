import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname);
const read = name => fs.readFileSync(path.join(root, name), "utf8");

let html = read("index.html");
const css = read("styles.css");
const engines = read("src/engines.js").replaceAll("export ", "");
const fixture = read("src/fixture.js").replace("export const fixture", "const fixture");
const app = read("src/app-v03.js")
  .replace(/^import .*?;\s*$/gm, "")
  .replace(/if\("serviceWorker" in navigator\)navigator\.serviceWorker\.register\("\.\/sw\.js"\)\.catch\(\(\)=>\{\}\);?/g, "");

// Parse the complete inline program before producing the user-facing file.
new Function(`${engines}\n${fixture}\n${app}`);

html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(/\s*<link rel="stylesheet" href="styles\.css" \/>/, `\n  <style>\n${css}\n  </style>`)
  .replace(/<script type="module" src="src\/app-v03\.js"><\/script>/, `<script>\n${engines}\n${fixture}\n${app}\n<\/script>`)
  .replace("<title>Flow Pilot</title>", "<title>Flow Pilot One File</title>");

fs.writeFileSync(path.join(root, "Flow-Pilot-One-File.html"), html);
