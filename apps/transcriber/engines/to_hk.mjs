// Runs a command and prints its output converted to Hong Kong Traditional, line by line as it arrives.
// Whisper picks Simplified or Traditional characters seemingly at random, even within one video.
// Usage: node to_hk.mjs COMMAND [ARGS...]
import { spawn } from "child_process"
import * as OpenCC from "opencc-js"
import readline from "readline"

const toHk = OpenCC.Converter({ from: "cn", to: "hk" })
const [cmd, ...args] = process.argv.slice(2)
const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "inherit"] })
readline.createInterface({ input: child.stdout }).on("line", (line) => process.stdout.write(toHk(line) + "\n"))
child.on("close", (code) => process.exit(code ?? 1))
