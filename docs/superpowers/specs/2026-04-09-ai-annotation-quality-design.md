# AI 标注效果提升设计方案

## 背景

当前 AI 标注系统存在两个核心问题：
1. Prompt 模板过于简单，AI 理解不准确
2. NER 标注的实体位置可能与原文不匹配

## 改进方案

### 1. Prompt 模板增强（Few-shot Learning）

**修改文件：** `backend/app/services/ai_service.py`

**改进内容：**
- 模板新增 `{{examples}}` 占位符
- 项目配置的 `labels`/`entity_labels` 中可附带 `examples` 字段
- AI 服务调用时自动将示例注入 Prompt

**示例配置格式：**
```json
{
  "labels": [
    {"name": "科技", "examples": ["华为发布新手机", "AI技术突破"]},
    {"name": "体育", "examples": ["足球比赛精彩瞬间", "奥运金牌"]}
  ]
}
```

**生成 Prompt 示例：**
```
你是一个文本分类助手。请根据以下示例进行分类：

示例1：
文本："华为发布新手机"
分类：["科技"]

示例2：
文本："足球比赛精彩瞬间"
分类：["体育"]

待分类文本："苹果公司发布新品"
```

---

### 2. NER 实体位置校验与修正

**修改文件：** `backend/app/services/ai_service.py` 的 `_parse_response` 方法

**改进内容：**
- 解析实体后校验 `start/end` 是否在原文范围内
- 位置不匹配时，在原文中重新查找实体文本
- 找不到或修正后仍不匹配，标记为 `invalid_entities`

**校验逻辑：**
```python
def validate_entity(text, entity):
    """校验并修正实体位置"""
    start, end = entity.get("start", 0), entity.get("end", 0)
    extracted = text[start:end] if 0 <= start < end <= len(text) else None

    if extracted == entity.get("text"):
        return entity  # 位置正确

    # 尝试在原文中重新查找
    new_start = text.find(entity.get("text", ""))
    if new_start != -1:
        entity["start"] = new_start
        entity["end"] = new_start + len(entity["text"])
        return entity

    return None  # 无法修正，标记为无效
```

---

### 3. 解析失败重试机制

**修改文件：** `backend/app/services/ai_service.py` 的 `annotate_single` 方法

**改进内容：**
- 首次解析失败后，用更严格的 Prompt 重试一次
- 严格 Prompt 要求 AI 只输出纯 JSON，不带任何解释
- 两次都失败才返回原始响应并标记 `parse_error: true`

---

## 不改动范围

- UI 风格保持不变
- 前端代码不做修改
- API 接口格式不变
- 现有数据格式兼容

---

## 测试计划

1. 使用 `test-data/` 中的测试数据进行验证
2. 对比改进前后的 AI 标注结果
3. 重点验证 NER 实体位置准确性
