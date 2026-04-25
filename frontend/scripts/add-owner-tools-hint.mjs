import fs from "fs"

const patches = [
  {
    file: "src/locales/ar.json",
    after: `    "clientOnlyNote": "هذا تظهر عند العميل فقط",\n`,
    insert: `    "ownerToolsHint": "هذا التظهر عند الناشر في اسفل التعليقات",\n`,
  },
  {
    file: "src/locales/en.json",
    after: `    "clientOnlyNote": "This shows to client only",\n`,
    insert: `    "ownerToolsHint": "Shown to the publisher below the comments",\n`,
  },
]

for (const { file, after, insert } of patches) {
  const path = new URL(file, import.meta.url)
  let t = fs.readFileSync(path, "utf8")
  if (t.includes('"ownerToolsHint"')) {
    console.log(file, "skip")
    continue
  }
  if (!t.includes(after)) throw new Error(`needle not found: ${file}`)
  t = t.replace(after, after + insert)
  fs.writeFileSync(path, t)
  console.log(file, "ok")
}
