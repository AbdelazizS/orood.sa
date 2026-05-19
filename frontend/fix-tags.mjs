import fs from "fs"
const p = process.argv[2]
const tag = "motion-div"
let s = fs.readFileSync(p, "utf8")
s = s.replaceAll(`</${tag}>`, "</div>")
s = s.replaceAll(`<${tag}`, "<div")
fs.writeFileSync(p, s)
