import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/analyze-search-console.mjs <search-console-export.csv>");
  process.exit(1);
}

const csv = fs.readFileSync(path.resolve(input), "utf8").replace(/^\uFEFF/, "");
const rows = parseCsv(csv);
if (!rows.length) throw new Error("The Search Console CSV contains no data rows.");

const normalized = rows.map(row => ({
  query: value(row, ["Top queries","Queries","query"]),
  page: value(row, ["Top pages","Pages","page"]),
  clicks: number(row, ["Clicks","clicks"]),
  impressions: number(row, ["Impressions","impressions"]),
  ctr: number(row, ["CTR","ctr"]),
  position: number(row, ["Position","position"])
})).filter(row => row.query || row.page);

const byQuery = aggregate(normalized, "query");
const byPage = aggregate(normalized, "page");

const highImpressionLowCtr = [...byQuery.values()]
  .filter(x => x.impressions >= 100 && x.ctr < 0.03)
  .sort((a,b) => b.impressions-a.impressions)
  .slice(0,20);

const nearPageOne = [...byQuery.values()]
  .filter(x => x.impressions >= 20 && x.position >= 5 && x.position <= 20)
  .sort((a,b) => b.impressions-a.impressions)
  .slice(0,20);

const pageOpportunities = [...byPage.values()]
  .filter(x => x.impressions >= 100 && x.ctr < 0.05)
  .sort((a,b) => b.impressions-a.impressions)
  .slice(0,20);

console.log("# Search Console opportunity report\n");
console.log("Rows analyzed: " + normalized.length);
console.log("Unique queries: " + byQuery.size);
console.log("Unique pages: " + byPage.size + "\n");

printTable("## High impressions, low CTR queries", highImpressionLowCtr, ["query","impressions","clicks","ctr","position"]);
printTable("## Queries ranking on the first two result pages", nearPageOne, ["query","impressions","clicks","ctr","position"]);
printTable("## Pages with impressions but weak CTR", pageOpportunities, ["page","impressions","clicks","ctr","position"]);

console.log("\n## Recommended workflow");
console.log("1. Check indexing/canonicalization before rewriting any page.");
console.log("2. For high-impression/low-CTR queries, align title and description with the exact intent.");
console.log("3. For positions 5–20, improve the page's practical answer and internal links before creating another URL.");
console.log("4. Only create a new page when the query represents a genuinely different task or user problem.");
console.log("5. Re-run this report after meaningful changes and compare query/page movement.");

function value(row, names) {
  for (const name of names) if (row[name] !== undefined) return String(row[name] ?? "").trim();
  return "";
}
function number(row, names) {
  const original = value(row, names).trim();
  const isCtr = names.includes("CTR") || names.includes("ctr");
  const raw = original.replace(/%/g, "").replace(/,/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return isCtr ? (original.includes("%") ? n / 100 : n) : n;
}
function aggregate(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!k) continue;
    const item = map.get(k) || { [key]: k, clicks:0, impressions:0, ctr:0, position:0 };
    item.clicks += row.clicks;
    item.impressions += row.impressions;
    item.positionNumerator += row.position * row.impressions;
    map.set(k,item);
  }
  for (const item of map.values()) {
    item.ctr = item.impressions ? item.clicks / item.impressions : 0;
    item.position = item.impressions ? item.positionNumerator / item.impressions : 0;
    delete item.positionNumerator;
  }
  return map;
}
function printTable(title, rows, columns) {
  console.log("\n" + title);
  if (!rows.length) {
    console.log("No rows matched the threshold.");
    return;
  }
  console.log("| " + columns.join(" | ") + " |");
  console.log("| " + columns.map(()=> "---").join(" | ") + " |");
  for (const row of rows) {
    console.log("| " + columns.map(c => c==="ctr" ? (row[c]*100).toFixed(2)+"%" : c==="position" ? row[c].toFixed(1) : String(row[c]).replace(/\|/g," ")).join(" | ") + " |");
  }
}
function parseCsv(text) {
  const rows=[]; let row=[]; let field=""; let quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch===""" && text[i+1]==="""){field+=""";i++;continue;}
      if(ch==="""){quoted=false;continue;}
      field+=ch; continue;
    }
    if(ch==="""){quoted=true;continue;}
    if(ch===","){row.push(field);field="";continue;}
    if(ch==="\n" || ch==="\r"){
      if(ch==="\r" && text[i+1]==="\n") i++;
      row.push(field);field="";
      if(row.some(v=>v!=="")) rows.push(row);
      row=[]; continue;
    }
    field+=ch;
  }
  row.push(field);
  if(row.some(v=>v!=="")) rows.push(row);
  if(!rows.length) return [];
  const headers=rows[0];
  return rows.slice(1).map(cells => Object.fromEntries(headers.map((h,i)=>[h,cells[i] ?? ""])));
}