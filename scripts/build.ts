import path from "node:path"
import { x } from "tinyexec"

const outdir = path.join(import.meta.dirname, "..", "dist")
const outfile = path.join(outdir, "ai-studio-api")
const entry = path.join(import.meta.dirname, "..", "src", "main.ts")

const result = await x("bun", [
  "build",
  "--compile",
  "--minify",
  "--bytecode",
  "--outfile",
  outfile,
  entry,
])

process.stdout.write(result.stdout)
process.stderr.write(result.stderr)
