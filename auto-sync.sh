#!/bin/bash
# 自动同步：文件保存后自动 commit + push 到 GitHub
# 后台运行：./auto-sync.sh &

DIR="$HOME/profile-site"
cd "$DIR"

echo "👀 正在监视 $DIR ..."
echo "   修改文件后自动推送到 GitHub"
echo "   按 Ctrl+C 停止"
echo ""

fswatch -o "$DIR" --exclude='\.git/' | while read; do
  sleep 1
  git add -A
  if git diff --cached --quiet; then
    continue
  fi
  NOW=$(date '+%m-%d %H:%M')
  git commit -m "自动更新 — $NOW"
  git push
  echo "✅ 已推送 — $NOW"
done
