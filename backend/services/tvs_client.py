"""TVS API 客户端 — 占位（P2 接入）"""

# P2: 当 KOC Engine 需要调用 TVS 生成视频时实现
# 当前 MVP 不接 TVS，KOC 手动上传视频链接


class TvsClient:
    """TVS Video Tool API 客户端"""

    def __init__(self, base_url: str = "http://localhost:8000", api_key: str = ""):
        self.base_url = base_url
        self.api_key = api_key

    async def create_video_task(self, product_url: str, platforms: list[str]) -> dict:
        """创建视频生成任务"""
        raise NotImplementedError("TVS integration is P2 — not yet implemented")

    async def get_task_status(self, task_id: str) -> dict:
        """查询任务状态"""
        raise NotImplementedError("TVS integration is P2 — not yet implemented")


tvs_client = TvsClient()
