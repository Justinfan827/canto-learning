# Runs a command and prints its output converted to Hong Kong Traditional, line by line as it arrives.
# Whisper picks Simplified or Traditional characters seemingly at random, even within one video.
# Usage: python to_hk.py COMMAND [ARGS...]
import subprocess
import sys

import opencc

to_hk = opencc.OpenCC("s2hk")

p = subprocess.Popen(sys.argv[1:], stdout=subprocess.PIPE, text=True, encoding="utf-8")
for line in p.stdout:
    print(to_hk.convert(line), end="", flush=True)
sys.exit(p.wait())
