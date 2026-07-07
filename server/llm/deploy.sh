#!/usr/bin/env bash
# Reflow LLM proxy deploy — pushes the updated server.js (chat + plan_deck tasks)
# and switches the model to MiniMax-M3, then rebuilds the box container and runs
# a health check + a live chat generation to confirm M3 is a valid model id.
# Backups: server.js.bak.presp7 + .env.bak.presp7 already on the box (rollback below).
set -euo pipefail

BOX="Senul@100.86.148.112"
KEY="$HOME/OpenClaw_key.pem"
PORT=2222

echo "→ copying server.js to the box"
scp -P "$PORT" -i "$KEY" "$HOME/reflow/server/llm/server.js" "$BOX:~/reflow-llm/server.js"

echo "→ setting MINIMAX_MODEL=MiniMax-M3, rebuilding, testing"
ssh -p "$PORT" -i "$KEY" "$BOX" 'bash -s' <<'REMOTE'
set -e
cd ~/reflow-llm
cp -n .env .env.bak.presp7 2>/dev/null || true
if grep -q "^MINIMAX_MODEL=" .env; then
  sed -i "s/^MINIMAX_MODEL=.*/MINIMAX_MODEL=MiniMax-M3/" .env
else
  echo "MINIMAX_MODEL=MiniMax-M3" >> .env
fi
echo "model set to: $(grep ^MINIMAX_MODEL= .env)"
sudo docker compose up -d --build | tail -6
sleep 3
echo "=== health ==="
sudo docker exec reflow-llm node -e 'fetch("http://localhost:8787/").then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))'
echo "=== live chat test (confirms M3 is a valid model id) ==="
sudo docker exec reflow-llm node -e 'fetch("http://localhost:8787/",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+process.env.REFLOW_LLM_TOKEN},body:JSON.stringify({task:"chat",input:{messages:[{role:"user",content:"Reply with exactly: hello from M3"}],studentModel:{}}})}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j))).catch(e=>console.log("ERR",e.message))'
REMOTE
echo "✓ done. If the chat test shows an error about the model id, tell Claude — M3's exact id may differ; rollback:"
echo "  ssh -p $PORT -i $KEY $BOX 'cd ~/reflow-llm && cp server.js.bak.presp7 server.js && cp .env.bak.presp7 .env && sudo docker compose up -d --build'"
