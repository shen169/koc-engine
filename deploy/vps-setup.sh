#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
# KOC Engine — VPS 一键部署脚本
# 适用于 Ubuntu 22.04/24.04 LTS
# 用法: chmod +x vps-setup.sh && sudo ./vps-setup.sh
# ══════════════════════════════════════════════════════
set -euo pipefail

APP_NAME="koc-engine"
APP_DIR="/opt/${APP_NAME}"
DOMAIN="${1:-kocengine.com}"
VENV_DIR="${APP_DIR}/venv"
USER="${APP_NAME}"
GROUP="${APP_NAME}"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[koc-engine]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
fail() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

# ── 检查 ──
[[ $EUID -eq 0 ]] || fail "请用 sudo 运行"
[[ -n "$DOMAIN" ]] || fail "用法: sudo ./vps-setup.sh <your-domain.com>"

log "开始部署 KOC Engine 到 ${DOMAIN}"

# ══════════════════════════════════════════
# 1. 系统依赖
# ══════════════════════════════════════════
log "安装系统依赖..."
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git curl ufw

# ══════════════════════════════════════════
# 2. 创建专用用户
# ══════════════════════════════════════════
if ! id -u "${USER}" >/dev/null 2>&1; then
    log "创建用户 ${USER}..."
    useradd --system --no-create-home --shell /bin/false "${USER}"
fi
ok "用户 ${USER} 就绪"

# ══════════════════════════════════════════
# 3. 部署代码
# ══════════════════════════════════════════
if [[ -d "${APP_DIR}" ]]; then
    log "代码目录已存在，更新..."
    cd "${APP_DIR}"
    git pull origin main
else
    log "克隆代码..."
    git clone https://github.com/shen169/koc-engine.git "${APP_DIR}"
    cd "${APP_DIR}"
fi

# ══════════════════════════════════════════
# 4. Python 虚拟环境
# ══════════════════════════════════════════
log "配置 Python 环境..."
python3 -m venv "${VENV_DIR}"
source "${VENV_DIR}/bin/activate"
pip install --upgrade pip -q
pip install -r backend/requirements.txt -q
ok "Python 依赖安装完成"

# ══════════════════════════════════════════
# 5. 创建 .env（如果不存在）
# ══════════════════════════════════════════
if [[ ! -f "${APP_DIR}/backend/.env" ]]; then
    log "创建 backend/.env..."
    cat > "${APP_DIR}/backend/.env" << 'EOF'
# KOC Engine 生产环境配置
DEEPSEEK_API_KEY=your-deepseek-api-key-here
JWT_SECRET=change-this-to-a-random-string
ACCESS_PASSWORD=change-this-admin-password
EOF
    fail ".env 已生成，请编辑 ${APP_DIR}/backend/.env 填入真实 API Key 后重新运行本脚本（或跳过此步骤手动编辑）"
else
    ok "backend/.env 已存在"
fi

# ══════════════════════════════════════════
# 6. 创建 output 目录
# ══════════════════════════════════════════
mkdir -p "${APP_DIR}/output/tasks" "${APP_DIR}/output/users"
chown -R "${USER}:${GROUP}" "${APP_DIR}"

# ══════════════════════════════════════════
# 7. systemd 服务
# ══════════════════════════════════════════
log "安装 systemd 服务..."
cp "${APP_DIR}/deploy/koc-engine.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable koc-engine
systemctl restart koc-engine
ok "systemd 服务已启动"

# ══════════════════════════════════════════
# 8. nginx 反向代理
# ══════════════════════════════════════════
log "配置 nginx..."
cp "${APP_DIR}/deploy/nginx-koc-engine.conf" "/etc/nginx/sites-available/${APP_NAME}"
sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" "/etc/nginx/sites-available/${APP_NAME}"
ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/"
nginx -t && systemctl reload nginx
ok "nginx 配置完成"

# ══════════════════════════════════════════
# 9. SSL 证书（Let's Encrypt）
# ══════════════════════════════════════════
log "申请 SSL 证书..."
if certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "admin@${DOMAIN}" --redirect; then
    ok "SSL 证书配置成功"
else
    log "SSL 证书申请失败（可能 DNS 还未生效），稍后可手动运行:"
    log "  sudo certbot --nginx -d ${DOMAIN}"
fi

# ══════════════════════════════════════════
# 10. 防火墙
# ══════════════════════════════════════════
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable
ok "防火墙已配置（80/443/22）"

# ══════════════════════════════════════════
# 11. 验证
# ══════════════════════════════════════════
sleep 2
echo ""
log "====================================="
log "  部署完成！"
log "====================================="
log "验证后端: curl https://${DOMAIN}/api/health"
log "验证 systemd: systemctl status koc-engine"
log "查看日志: journalctl -u koc-engine -f"
log ""
log "前端 Vercel 设置环境变量:"
log "  NEXT_PUBLIC_API_URL=https://${DOMAIN}"
log "====================================="

# 自动验证
if curl -sf "http://localhost:8001/api/health" > /dev/null 2>&1; then
    ok "后端服务响应正常"
else
    fail "后端未响应，检查: journalctl -u koc-engine -n 30"
fi
