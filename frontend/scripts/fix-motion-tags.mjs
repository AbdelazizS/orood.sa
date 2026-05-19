import fs from "fs"

const files = process.argv.slice(2)
const badOpen = "<motion.div"
const goodOpen = "<div"
const badClose = "</motion.div>"
const goodClose = "</div>"

for (const p of files) {
  let s = fs.readFileSync(p, "utf8")
  s = s.split(badOpen).join(goodOpen).split(badClose).join(goodClose)
  fs.writeFileSync(p, s)
  console.log("fixed", p)
}
