#!/usr/bin/env bash
# Resynchronise les plages IP Cloudflare dans la config Traefik (trustedIPs + allowlist).
# Usage : ./scripts/cloudflare-ips.sh && docker compose restart traefik
set -euo pipefail
cd "$(dirname "$0")/../core/traefik"
ips=$( (curl -fsS https://www.cloudflare.com/ips-v4; echo; curl -fsS https://www.cloudflare.com/ips-v6) | grep -v '^$')
python3 - "$ips" <<'PY'
import re, sys
ips = sys.argv[1].split()
def block(indent): return "".join(f"{indent}- {ip}\n" for ip in ips)
p = "traefik.yml"; s = open(p).read()
s = re.sub(r"(      trustedIPs:\n)(?:        - .*\n)+", lambda m: m.group(1) + block("        "), s)
open(p, "w").write(s)
p = "dynamic/middlewares.yml"; s = open(p).read()
s = re.sub(r"(# BEGIN cloudflare-ips\n)(?:.*\n)*?(\s*# END cloudflare-ips)",
           lambda m: m.group(1) + block("          ") + m.group(2).lstrip("\n"), s)
open(p, "w").write(s)
PY
git -C .. diff --stat -- core/traefik
