# AI 标注效果提升实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提升 AI 标注质量，通过 Few-shot Prompt、NER 位置校验、解析失败重试三个改进点实现

**Architecture:** 修改 `ai_service.py` 中的 `_build_prompt`、`_parse_response`、`annotate_single` 三个核心方法，保持 API 接口不变

**Tech Stack:** Python, FastAPI, OpenAI/Ollama 兼容 API

---

## 文件映射

| 文件 | 改动 |
|------|------|
| `backend/app/services/ai_service.py` | 核心逻辑修改 |
| `backend/app/services/ai_service.py:51-122` | `_get_default_templates` 添加 examples 支持 |
| `backend/app/services/ai_service.py:204-232` | `_build_prompt` 新增 examples 注入逻辑 |
| `backend/app/services/ai_service.py:234-296` | `_parse_response` 新增 NER 校验和重试逻辑 |
| `backend/app/services/ai_service.py:298-314` | `annotate_single` 整合重试机制 |
| `test-data/text_classification.json` | 测试数据添加 examples |
| `test-data/ner.json` | 测试数据保持现有格式 |

---

## Task 1: Few-shot Examples 注入

**Files:**
- Modify: `backend/app/services/ai_service.py:51-122` (_get_default_templates)
- Modify: `backend/app/services/ai_service.py:204-232` (_build_prompt)

- [ ] **Step 1: 读取现有 `_get_default_templates` 方法**

确认当前模板结构，为后续添加 examples 占位符做准备。

- [ ] **Step 2: 修改 `_build_prompt` 方法，添加 examples 注入逻辑**

在方法中添加：
```python
# 在变量替换前，检测是否有 examples 配置
def _build_prompt(self, content: Dict[str, Any], annotation_type: str,
                  config: Dict[str, Any], template: str = None) -> str:
    # ... 现有代码 ...

    # 新增：构建 few-shot examples
    examples_text = ""
    if annotation_type == "text_classification":
        labels = config.get("labels", [])
        example_parts = []
        for label in labels:
            label_name = label.get("name", "")
            examples = label.get("examples", [])
            for ex in examples[:2]:  # 最多2个示例
                example_parts.append(f'文本：" {ex}"\n分类：["{label_name}"]')
        if example_parts:
            examples_text = "请参考以下示例进行分类：\n\n" + "\n\n".join(example_parts) + "\n\n"

    # 在 template 末尾追加 examples
    prompt = template
    prompt = prompt.replace("{{examples}}", examples_text)
    # ... 后续变量替换 ...
```

- [ ] **Step 3: 修改 `_get_default_templates` 中 NER 模板，添加 `{{examples}}` 占位符**

```python
"ner": """你是一个命名实体识别助手。请识别文本中的实体及其类型。

Text: {{text}}

Available entity types: {{entity_labels}}

{{examples}}

请响应以下 JSON 格式：
{
  "entities": [
    {"text": "实体文本", "label": "实体类型", "start": 0, "end": 10}
  ]
}
注意：start 和 end 是字符位置。""",
```

- [ ] **Step 4: 运行测试验证**

检查 ai_service 是否正常加载，模板是否正确替换。

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/ai_service.py
git commit -m "feat: add few-shot examples injection in prompt templates"
```

---

## Task 2: NER 实体位置校验与修正

**Files:**
- Modify: `backend/app/services/ai_service.py:234-296` (_parse_response)

- [ ] **Step 1: 在 `_parse_response` 方法中添加 NER 校验辅助函数**

在 `_parse_response` 方法开头添加：

```python
def _validate_ner_entities(self, text: str, entities: List[Dict]) -> List[Dict]:
    """校验并修正 NER 实体位置"""
    validated = []
    for entity in entities:
        entity_text = entity.get("text", "")
        start = entity.get("start", 0)
        end = entity.get("end", 0)

        # 基本范围检查
        if not (0 <= start < end <= len(text)):
            continue  # 范围无效，跳过

        # 验证位置是否匹配文本
        extracted = text[start:end]
        if extracted == entity_text:
            validated.append(entity)
            continue

        # 尝试在原文中重新查找
        new_start = text.find(entity_text)
        if new_start != -1:
            entity["start"] = new_start
            entity["end"] = new_start + len(entity_text)
            validated.append(entity)
            continue

        # 找不到匹配，标记为无效
        entity["_invalid"] = True
        entity["_original_start"] = start
        entity["_original_end"] = end
        validated.append(entity)

    return validated
```

- [ ] **Step 2: 修改 `_parse_response` 中的 NER 解析分支**

在 `annotation_type == "ner"` 的分支中调用校验：

```python
elif annotation_type == "ner":
    entities = parsed.get("entities", [])
    # 新增：校验并修正实体位置
    entities = self._validate_ner_entities(
        content.get("text", ""),
        entities
    )
    return {
        "type": "ner",
        "content": {
            "entities": entities
        }
    }
```

- [ ] **Step 3: 运行测试验证 NER 校验逻辑**

使用一条 NER 测试数据验证位置校验是否生效。

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/ai_service.py
git commit -m "feat: add NER entity position validation and auto-correction"
```

---

## Task 3: 解析失败重试机制

**Files:**
- Modify: `backend/app/services/ai_service.py:298-314` (annotate_single)

- [ ] **Step 1: 在 `annotate_single` 方法中添加重试逻辑**

修改 `annotate_single` 方法：

```python
async def annotate_single(self, item_content: Dict[str, Any], annotation_type: str,
                          config: Dict[str, Any], prompt_template: str = None) -> Dict[str, Any]:
    # 第一次尝试
    prompt = self._build_prompt(item_content, annotation_type, config, prompt_template)

    try:
        response = await self._call_llm(prompt)
        result = self._parse_response(response, annotation_type)

        # 检查是否是解析错误
        if result.get("parse_error"):
            # 重试一次，使用更严格的 prompt
            retry_result = await self._retry_with_strict_prompt(
                item_content, annotation_type, config
            )
            if retry_result and not retry_result.get("parse_error"):
                result = retry_result

        result["is_ai_generated"] = True
        return result
    except Exception as e:
        return {
            "type": annotation_type,
            "content": {"error": str(e)},
            "is_ai_generated": True,
            "error": True
        }

async def _retry_with_strict_prompt(self, item_content: Dict[str, Any],
                                     annotation_type: str,
                                     config: Dict[str, Any]) -> Dict[str, Any]:
    """使用严格格式要求重试"""
    strict_prompt = f"""请以纯 JSON 格式输出，不要包含任何解释、 markdown 标记或其他内容。
只输出一个有效的 JSON 对象。

任务：{self._get_task_description(annotation_type)}

数据：{json.dumps(item_content, ensure_ascii=False)}

必须严格遵循以下 JSON 格式：
{self._get_strict_schema(annotation_type)}"""

    try:
        response = await self._call_llm(strict_prompt)
        result = self._parse_response(response, annotation_type)
        return result
    except Exception:
        return None

def _get_task_description(self, annotation_type: str) -> str:
    """获取任务描述"""
    descriptions = {
        "text_classification": "文本分类",
        "ner": "命名实体识别",
        "relation_extraction": "关系抽取",
        "dialog": "对话质量评估",
        "score_review": "评分评审",
    }
    return descriptions.get(annotation_type, annotation_type)

def _get_strict_schema(self, annotation_type: str) -> str:
    """获取严格 JSON Schema"""
    schemas = {
        "text_classification": '{"labels": ["标签1", "标签2"]}',
        "ner": '{"entities": [{"text": "实体", "label": "类型", "start": 0, "end": 5}]}',
        "relation_extraction": '{"entities": [], "relations": []}',
        "dialog": '{"quality": "good", "issues": [], "suggestions": [], "score": 85}',
        "score_review": '{"scores": {}, "total_score": 0, "comments": ""}',
    }
    return schemas.get(annotation_type, "{}")
```

- [ ] **Step 2: 验证重试机制**

模拟一次解析失败，验证重试是否执行。

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/ai_service.py
git commit -m "feat: add parse failure retry with strict prompt"
```

---

## Task 4: 端到端测试验证

**Files:**
- 测试数据使用 `test-data/text_classification.json` 和 `test-data/ner.json`

- [ ] **Step 1: 启动后端服务**

```bash
cd backend
call venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- [ ] **Step 2: 测试单条 AI 标注**

通过 API 或直接调用 `ai_service.annotate_single` 测试 NER 和分类。

- [ ] **Step 3: 验证 Few-shot 是否生效**

检查生成的 prompt 中是否包含 examples。

- [ ] **Step 4: 验证 NER 位置校验**

用 mock 数据测试位置错误时是否能修正。

- [ ] **Step 5: Commit 最终改动**

```bash
git add -A
git commit -m "feat: complete AI annotation quality improvements"
```

---

## 验收标准

1. **Few-shot**: 模板中的 `{{examples}}` 被正确替换为示例文本
2. **NER 校验**: 位置错误的实体被修正或标记
3. **重试机制**: 解析失败时触发重试，不直接返回原始响应
4. **无回归**: 现有 API 接口行为不变
5. **UI 无改动**: 前端代码无任何修改

---

## 风险与注意事项

- 重试机制会增加 API 调用次数，注意 token 消耗
- Few-shot 示例数量需控制，避免 prompt 过长
- 位置校验可能改变原始实体顺序，需确保 UI 显示一致
