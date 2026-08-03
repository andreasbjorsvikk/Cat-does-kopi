#!/bin/bash
echo "=== remotes ==="
git remote -v
echo ""
echo "=== branches ==="
git branch -a
echo ""
echo "=== current commit ==="
git log -1 --oneline