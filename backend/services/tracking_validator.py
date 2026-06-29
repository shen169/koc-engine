"""物流单号格式验证服务

双层策略：
1. tracking-numbers 库 — 校验 checksum (Mod10/Mod7/Luhn/S10) + 自动识别快递公司
2. Regex 格式兜底 — 库不可用时降级为正则格式检查

支持的快递公司：UPS, FedEx, USPS, DHL, SF Express, Amazon Logistics
"""

import re
from typing import Optional

# ── 快递公司列表 ──────────────────────────────

VALID_CARRIERS = {
    "ups", "fedex", "usps", "dhl",
    "sf-express", "sfexpress", "sf", "顺丰",
    "amazon-logistics", "amazon",
    "yunexpress", "4px",
}

# ── Regex 格式规则（tracking-numbers 库不可用时的兜底）──

# 格式: (carrier_key, regex_pattern, example, description)
TRACKING_PATTERNS = [
    # UPS
    ("ups", r"^1Z[A-HJ-NP-R-Z0-9]{16}$", "1Z5R89390357567127", "UPS Standard"),
    ("ups", r"^[A-Z]\d{10}$", "K2479825491", "UPS Waybill"),
    ("ups", r"^\d{18}$", "123456789012345678", "UPS 18-digit"),
    # FedEx
    ("fedex", r"^\d{12}$", "986578788855", "FedEx Express"),
    ("fedex", r"^\d{15}$", "041441760228964", "FedEx Ground"),
    ("fedex", r"^\d{22}$", "9611020987654312345672", "FedEx SmartPost (22 digits)"),
    ("fedex", r"^96\d{20}$", "9611020987654312345672", "FedEx 96-series"),
    # USPS
    ("usps", r"^\d{20}$", "9400111899562712345678", "USPS Standard (20 digits)"),
    ("usps", r"^\d{22}$", "9400111899562712345678XX", "USPS Standard (22 digits)"),
    ("usps", r"^\d{26}$", "94001118995627123456781234", "USPS (26 digits)"),
    ("usps", r"^[A-Z]{2}\d{9}US$", "EK225651436US", "USPS International"),
    ("usps", r"^9[1-5]\d{20,32}$", "71969010756003077385", "USPS 91-series"),
    # DHL
    ("dhl", r"^\d{10}$", "3318810025", "DHL Express (10 digits)"),
    ("dhl", r"^\d{11}$", "33188100251", "DHL Express (11 digits)"),
    ("dhl", r"^[A-Z]{2}\d{16,18}$", "GM2951173225174494", "DHL eCommerce"),
    ("dhl", r"^[A-Z]\d{9}$", "J123456789", "DHL Global Mail"),
    # SF Express
    ("sf-express", r"^SF\d{12}$", "SF123456789012", "SF Express Standard"),
    ("sf-express", r"^\d{12}$", "123456789012", "SF Express (numeric)"),
    # Amazon Logistics
    ("amazon-logistics", r"^TBA\d{12}$", "TBA123456789012", "Amazon Logistics TBA"),
    ("amazon-logistics", r"^TBC\d{12}$", "TBC123456789012", "Amazon Logistics TBC"),
    ("amazon-logistics", r"^TBM\d{12}$", "TBM123456789012", "Amazon Logistics TBM"),
    # YunExpress
    ("yunexpress", r"^YT\d{14,16}$", "YT1234567890123456", "YunExpress YT"),
    ("yunexpress", r"^[A-Z]{2}\d{8,12}$", "YT123456789012", "YunExpress generic"),
    # 4PX
    ("4px", r"^\d{12,16}$", "1234567890123456", "4PX (12-16 digits)"),
]

# ── 快递公司别名 ──────────────────────────────

CARRIER_ALIASES = {
    "sf": "sf-express",
    "sfexpress": "sf-express",
    "顺丰": "sf-express",
    "amazon": "amazon-logistics",
}


def _normalize_carrier(carrier: str) -> str:
    """统一快递公司名称"""
    c = carrier.lower().strip().replace(" ", "-").replace("_", "-")
    return CARRIER_ALIASES.get(c, c)


def _validate_via_regex(number: str, carrier_hint: str = "") -> dict:
    """用正则格式验证单号"""
    number = number.strip().upper()

    # 如果有快递公司提示，优先匹配该快递公司的规则
    if carrier_hint:
        normalized = _normalize_carrier(carrier_hint)
        for pattern_carrier, pattern, example, desc in TRACKING_PATTERNS:
            if _normalize_carrier(pattern_carrier) == normalized:
                if re.match(pattern, number):
                    return {
                        "valid": True,
                        "carrier": normalized,
                        "format": desc,
                        "tracking_url": _build_tracking_url(normalized, number),
                        "error": None,
                    }
        return {
            "valid": False,
            "carrier": carrier_hint,
            "format": None,
            "tracking_url": None,
            "error": f"Invalid {normalized} tracking number format: {number}",
        }

    # 自动检测：尝试所有规则
    for pattern_carrier, pattern, example, desc in TRACKING_PATTERNS:
        if re.match(pattern, number):
            return {
                "valid": True,
                "carrier": _normalize_carrier(pattern_carrier),
                "format": desc,
                "tracking_url": _build_tracking_url(_normalize_carrier(pattern_carrier), number),
                "error": None,
            }

    # 都不匹配 → 宽松检查：至少是合理的长度（8-40位字母数字）
    if re.match(r"^[A-Z0-9]{8,40}$", number):
        return {
            "valid": True,  # 宽松通过（标记为 unknown carrier）
            "carrier": None,
            "format": "unknown",
            "tracking_url": None,
            "error": "Carrier not recognized; format appears valid",
        }

    return {
        "valid": False,
        "carrier": None,
        "format": None,
        "tracking_url": None,
        "error": f"Invalid tracking number format: {number}",
    }


def _build_tracking_url(carrier: str, number: str) -> Optional[str]:
    """生成快递追踪链接"""
    urls = {
        "ups": f"https://www.ups.com/track?track=yes&trackNums={number}",
        "fedex": f"https://www.fedex.com/fedextrack/?trknbr={number}",
        "usps": f"https://tools.usps.com/go/TrackConfirmAction?tLabels={number}",
        "dhl": f"https://www.dhl.com/en/express/tracking.html?AWB={number}",
        "sf-express": f"https://www.sf-express.com/we/ew/waybill/waybill-detail/{number}",
        "amazon-logistics": f"https://track.amazon.com/tracking/{number}",
        "yunexpress": f"https://www.yuntrack.com/track?trackingNumber={number}",
        "4px": f"https://track.4px.com/track?trackingNumber={number}",
    }
    return urls.get(carrier)


def validate_tracking_number(
    number: str,
    carrier_hint: str = "",
) -> dict:
    """验证快递单号格式

    Args:
        number: 快递单号
        carrier_hint: 快递公司提示（可选，用于精确验证）

    Returns:
        {
            "valid": bool,
            "carrier": str | None,     # 识别出的快递公司
            "format": str | None,      # 格式描述
            "tracking_url": str | None, # 追踪链接
            "error": str | None,        # 错误信息（valid=False 时）
            "method": str,              # 验证方法：checksum / regex / fallback
        }
    """
    number = number.strip()
    if not number:
        return {
            "valid": False,
            "carrier": None,
            "format": None,
            "tracking_url": None,
            "error": "Tracking number is empty",
            "method": "none",
        }

    # ── 策略 1: tracking-numbers 库（checksum 校验）──
    try:
        from tracking_numbers import get_tracking_number

        result = get_tracking_number(number)
        if result is not None and result.valid:
            carrier = _normalize_carrier(result.courier.code if hasattr(result.courier, 'code') else str(result.courier))
            return {
                "valid": True,
                "carrier": carrier,
                "format": f"{result.courier.name} ({result.courier.code})" if hasattr(result.courier, 'name') else str(result.courier),
                "tracking_url": result.tracking_url if hasattr(result, 'tracking_url') else _build_tracking_url(carrier, number),
                "error": None,
                "method": "checksum",
            }
        elif result is not None and not result.valid:
            return {
                "valid": False,
                "carrier": None,
                "format": None,
                "tracking_url": None,
                "error": f"Tracking number checksum invalid: {number}",
                "method": "checksum",
            }
    except ImportError:
        pass  # 降级为 regex
    except Exception:
        pass  # 库内部错误，降级

    # ── 策略 2: Regex 格式验证 ──
    regex_result = _validate_via_regex(number, carrier_hint)
    regex_result["method"] = "regex"
    return regex_result


def get_supported_carriers() -> list:
    """返回支持的快递公司列表"""
    return sorted(VALID_CARRIERS)


def auto_detect_carrier(number: str) -> Optional[str]:
    """自动识别快递单号所属快递公司"""
    result = validate_tracking_number(number)
    return result.get("carrier") if result["valid"] else None
