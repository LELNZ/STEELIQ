import { globSync } from "glob";
import fs from "fs";

const files = globSync("server/**/*.{ts,tsx,js,mjs,cjs}", { dot: true, nodir: true });

let changed = 0;
for (const f of files) {
  let src = fs.readFileSync(f, "utf8");
  if (!/from\s*['"]pg['"]/.test(src)) continue;

  // Replace every "import { ... } from 'pg'" with:
  //   import pg from 'pg';
  //   const { ... } = pg;
  const re = /import\s*\{\s*([^}]+?)\s*\}\s*from\s*['"]pg['"]\s*;?/g;

  let prev;
  let touched = false;
  do {
    prev = src;
    src = src.replace(re, (_m, namesRaw) => {
      touched = true;
      const names = namesRaw.split(",").map(s => s.trim()).filter(Boolean);
      const uniq = [...new Set(names)];
      const hasDefault = /import\s+pg\s+from\s+['"]pg['"]/.test(src);
      const defaultLine = hasDefault ? "" : "import pg from 'pg';\n";
      return `${defaultLine}const { ${uniq.join(", ")} } = pg;`;
    });
  } while (src !== prev);

  if (touched) {
    fs.writeFileSync(f, src, "utf8");
    console.log("fixed:", f);
    changed++;
  }
}

console.log(`pg import fixes applied to ${changed} file(s).`);
