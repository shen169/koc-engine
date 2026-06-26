#!/usr/bin/env bash
# ═══════════════════════════════════════════════
# KOC Engine — SSL 证书初始化（仅需运行一次）
# 用法: chmod +x ssl-init.sh && ./ssl-init.sh your-domain.com
# ═══════════════════════════════════════════════
set -euo pipefail

DOMAIN="${1:-}"
[[ -n "$DOMAIN" ]] || { echo "用法: ./ssl-init.sh <your-domain.com>"; exit 1; }

echo "=== KOC Engine SSL 初始化 ==="
echo "域名: ${DOMAIN}"
echo ""

# 1. 获取证书（HTTP-01 挑战，nginx 已配好 /.well-known/acme-challenge/）
echo "[1/3] 申请 SSL 证书..."
docker compose run --rm certbot \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    -d "${DOMAIN}" \
    --email "admin@${DOMAIN}" \
    --agree-tos \
    --no-eff-email

echo ""
echo "[2/3] 生成 SSL nginx 配置..."
sed -e "s/YOUR_DOMAIN/${DOMAIN}/g" nginx/koc-engine-ssl.conf > nginx/default.conf

echo ""
echo "[3/3] 重启 nginx..."
docker compose restart nginx

echo ""
echo "=== SSL 配置完成 ==="
echo "访问: https://${DOMAIN}/api/health"
echo "证书将自动续期（certbot 每 12 小时检查一次）"
