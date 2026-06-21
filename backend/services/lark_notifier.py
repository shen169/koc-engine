"""Feishu Bot webhook sender — for merchant notifications"""

import os
import json
import threading
import logging
from urllib.request import Request, urlopen
from urllib.error import URLError

log = logging.getLogger("lark_notifier")

DEFAULT_WEBHOOK = os.getenv("FEISHU_BOT_WEBHOOK", "")


def _send_lark_sync(webhook_url: str, title: str, content: str, resource_path: str = ""):
    """Send Feishu rich card via webhook."""
    if not webhook_url:
        log.info(f"[lark disabled] Title: {title}")
        return

    card = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": title},
                "template": "blue" if "approved" in title.lower() or "accept" in title.lower()
                           else "red" if "reject" in title.lower() or "violation" in title.lower()
                           else "green"
            },
            "elements": [
                {"tag": "div", "text": {"tag": "lark_md", "content": content}},
            ]
        }
    }

    if resource_path:
        card["card"]["elements"].append({
            "tag": "action",
            "actions": [{"tag": "button", "text": {"tag": "plain_text", "content": "View in Platform"},
                         "url": f"https://kocengine.com{resource_path}", "type": "default"}]
        })

    try:
        data = json.dumps(card).encode("utf-8")
        req = Request(webhook_url, data=data, headers={"Content-Type": "application/json"})
        urlopen(req, timeout=10)
        log.info(f"[lark sent] Title: {title}")
    except Exception as e:
        log.error(f"[lark failed] Title: {title} | Error: {e}")
        log.info(f"[lark fallback]\n{title}\n{content}")


def notify_merchant_lark(webhook_url: str, title: str, content: str, resource_path: str = ""):
    """Send Feishu notification in background thread."""
    if not webhook_url:
        webhook_url = DEFAULT_WEBHOOK
    if not webhook_url:
        log.info(f"[lark skipped — no webhook] Title: {title}")
        return
    t = threading.Thread(target=_send_lark_sync, args=(webhook_url, title, content, resource_path), daemon=True)
    t.start()
