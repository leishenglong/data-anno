"""AI Service - AI-assisted annotation functionality"""
import json
import asyncio
import re
from typing import Dict, Any, List, Optional
import httpx
from openai import AsyncOpenAI

from app.config import settings


class AIService:
    """AI 标注服务，支持 OpenAI 兼容 API 和 Ollama 本地模型"""

    def __init__(self):
        self.config_path = "./data/ai_config.json"
        self._config_cache = None

    def _load_config(self) -> Dict[str, Any]:
        """加载 AI 配置"""
        if self._config_cache is not None:
            return self._config_cache
        
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self._config_cache = json.load(f)
        except FileNotFoundError:
            self._config_cache = self._get_default_config()
            self._save_config(self._config_cache)
        
        return self._config_cache

    def _save_config(self, config: Dict[str, Any]):
        """保存 AI 配置"""
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        self._config_cache = config

    def _get_default_config(self) -> Dict[str, Any]:
        """获取默认配置"""
        return {
            "provider": "openai",
            "openai_api_key": settings.OPENAI_API_KEY,
            "openai_base_url": settings.OPENAI_BASE_URL,
            "openai_model": settings.OPENAI_MODEL,
            "ollama_base_url": settings.OLLAMA_BASE_URL,
            "ollama_model": settings.OLLAMA_MODEL,
            "prompt_templates": self._get_default_templates()
        }

    def _get_default_templates(self) -> Dict[str, str]:
        """获取默认 Prompt 模板"""
        return {
            "text_classification": """You are a text classification assistant. Please classify the following text into one or more categories from the provided labels.

Text: {{text}}

Available labels: {{labels}}

Please respond ONLY in the following JSON format:
{
  "labels": ["label1", "label2"]
}""",
            "ner": """You are a Named Entity Recognition (NER) assistant. Please identify all entities in the following text and their types.

Text: {{text}}

Available entity types: {{entity_labels}}

Please respond ONLY in the following JSON format:
{
  "entities": [
    {"text": "entity text", "label": "entity_type", "start": 0, "end": 10}
  ]
}
Note: start and end are character positions in the text.""",
            "relation_extraction": """You are a relation extraction assistant. Please identify entities and their relationships in the following text.

Text: {{text}}

Available entity types: {{entity_labels}}
Available relation types: {{relation_types}}

Please respond ONLY in the following JSON format:
{
  "entities": [
    {"id": 0, "text": "entity text", "label": "entity_type", "start": 0, "end": 10}
  ],
  "relations": [
    {"source": 0, "target": 1, "type": "relation_type"}
  ]
}""",
            "dialog": """You are a dialog quality assessment assistant. Please evaluate the following conversation.

Conversation:
{{dialog}}

Please respond ONLY in the following JSON format:
{
  "quality": "good|average|poor",
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "score": 85
}""",
            "score_review": """You are a scoring assistant. Please evaluate the following content on multiple dimensions.

Content: {{text}}

Scoring dimensions:
{{dimensions}}

Maximum score for each dimension: {{max_score}}

Please respond ONLY in the following JSON format:
{
  "scores": {
    "dimension_name": score
  },
  "total_score": total,
  "comments": "overall comments"
}"""
        }

    def get_config(self) -> Dict[str, Any]:
        """获取 AI 配置（隐藏 API Key）"""
        config = self._load_config()
        # 隐藏 API Key
        safe_config = config.copy()
        if safe_config.get("openai_api_key"):
            key = safe_config["openai_api_key"]
            safe_config["openai_api_key"] = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
        return safe_config

    def update_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """更新 AI 配置"""
        current = self._load_config()
        
        # 如果传入的 api_key 是掩码格式，保留原值
        api_key = config.get("openai_api_key", "")
        if "..." in api_key or api_key == "***":
            config["openai_api_key"] = current.get("openai_api_key", "")
        
        current.update(config)
        self._save_config(current)
        return self.get_config()

    def _get_openai_client(self) -> AsyncOpenAI:
        """获取 OpenAI 客户端"""
        config = self._load_config()
        return AsyncOpenAI(
            api_key=config.get("openai_api_key", ""),
            base_url=config.get("openai_base_url", settings.OPENAI_BASE_URL)
        )

    async def _call_openai(self, prompt: str, model: str = None) -> str:
        """调用 OpenAI API"""
        config = self._load_config()
        client = self._get_openai_client()
        model = model or config.get("openai_model", settings.OPENAI_MODEL)
        
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant for data annotation. Always respond in valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=2000
        )
        
        return response.choices[0].message.content

    async def _call_ollama(self, prompt: str, model: str = None) -> str:
        """调用 Ollama API"""
        config = self._load_config()
        base_url = config.get("ollama_base_url", settings.OLLAMA_BASE_URL)
        model = model or config.get("ollama_model", settings.OLLAMA_MODEL)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "system": "You are a helpful AI assistant for data annotation. Always respond in valid JSON format."
                },
                timeout=120.0
            )
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")

    async def _call_llm(self, prompt: str) -> str:
        """根据配置调用 LLM"""
        config = self._load_config()
        provider = config.get("provider", "openai")
        
        if provider == "ollama":
            return await self._call_ollama(prompt)
        else:
            return await self._call_openai(prompt)

    def _build_prompt(self, content: Dict[str, Any], annotation_type: str, 
                      config: Dict[str, Any], template: str = None) -> str:
        """构建标注 Prompt"""
        ai_config = self._load_config()
        
        # 使用自定义模板或默认模板
        if template is None:
            templates = ai_config.get("prompt_templates", {})
            template = templates.get(annotation_type, "")
        
        # 准备变量
        variables = {
            "text": content.get("text", ""),
            "labels": ", ".join([l.get("name", "") for l in config.get("labels", [])]),
            "entity_labels": ", ".join([l.get("name", "") for l in config.get("entity_labels", [])]),
            "relation_types": ", ".join(config.get("relation_types", [])),
            "dimensions": "\n".join([f"- {d.get('name', '')}: {d.get('description', '')}" 
                                     for d in config.get("score_dimensions", [])]),
            "max_score": str(config.get("max_score", 10)),
            "dialog": json.dumps(content.get("messages", []), ensure_ascii=False, indent=2)
        }
        
        # 替换模板变量
        prompt = template
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            prompt = prompt.replace(placeholder, value)
        
        return prompt

    def _parse_response(self, response: str, annotation_type: str) -> Dict[str, Any]:
        """解析 LLM 返回为标准标注格式"""
        # 尝试提取 JSON
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            json_str = json_match.group(0)
            try:
                parsed = json.loads(json_str)
                
                # 标准化不同标注类型的输出
                if annotation_type == "text_classification":
                    return {
                        "type": "text_classification",
                        "content": {
                            "labels": parsed.get("labels", [])
                        }
                    }
                elif annotation_type == "ner":
                    return {
                        "type": "ner",
                        "content": {
                            "entities": parsed.get("entities", [])
                        }
                    }
                elif annotation_type == "relation_extraction":
                    return {
                        "type": "relation_extraction",
                        "content": {
                            "entities": parsed.get("entities", []),
                            "relations": parsed.get("relations", [])
                        }
                    }
                elif annotation_type == "dialog":
                    return {
                        "type": "dialog",
                        "content": {
                            "quality": parsed.get("quality", "average"),
                            "issues": parsed.get("issues", []),
                            "suggestions": parsed.get("suggestions", []),
                            "score": parsed.get("score", 0)
                        }
                    }
                elif annotation_type == "score_review":
                    return {
                        "type": "score_review",
                        "content": {
                            "scores": parsed.get("scores", {}),
                            "total_score": parsed.get("total_score", 0),
                            "comments": parsed.get("comments", "")
                        }
                    }
                else:
                    return {"type": annotation_type, "content": parsed}
                    
            except json.JSONDecodeError:
                pass
        
        # Fallback: 返回原始响应
        return {
            "type": annotation_type,
            "content": {"raw_response": response},
            "parse_error": True
        }

    async def annotate_single(self, item_content: Dict[str, Any], annotation_type: str,
                              config: Dict[str, Any], prompt_template: str = None) -> Dict[str, Any]:
        """单条 AI 标注，返回标注结果"""
        prompt = self._build_prompt(item_content, annotation_type, config, prompt_template)
        
        try:
            response = await self._call_llm(prompt)
            result = self._parse_response(response, annotation_type)
            result["is_ai_generated"] = True
            return result
        except Exception as e:
            return {
                "type": annotation_type,
                "content": {"error": str(e)},
                "is_ai_generated": True,
                "error": True
            }

    async def annotate_batch(self, items: List[Dict[str, Any]], annotation_type: str,
                             config: Dict[str, Any], prompt_template: str = None) -> List[Dict[str, Any]]:
        """批量 AI 标注"""
        results = []
        for item in items:
            result = await self.annotate_single(
                item.get("content", {}),
                annotation_type,
                config,
                prompt_template
            )
            result["item_id"] = item.get("id")
            results.append(result)
            # 添加小延迟避免请求过快
            await asyncio.sleep(0.1)
        return results

    # 各提供商的预设配置
    PROVIDER_PRESETS = {
        "openai": {
            "name": "OpenAI",
            "base_url": "https://api.openai.com/v1",
            "models": [
                {"id": "gpt-4o-mini", "name": "GPT-4o Mini"},
                {"id": "gpt-4o", "name": "GPT-4o"},
                {"id": "gpt-4-turbo", "name": "GPT-4 Turbo"},
                {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"},
            ]
        },
        "zhipu": {
            "name": "智谱 AI (GLM)",
            "base_url": "https://open.bigmodel.cn/api/paas/v4",
            "models": [
                {"id": "glm-4-flash", "name": "GLM-4 Flash (免费)"},
                {"id": "glm-4-air", "name": "GLM-4 Air"},
                {"id": "glm-4-airx", "name": "GLM-4 AirX"},
                {"id": "glm-4-long", "name": "GLM-4 Long"},
                {"id": "glm-4-plus", "name": "GLM-4 Plus"},
                {"id": "glm-4", "name": "GLM-4"},
            ]
        },
        "qwen": {
            "name": "通义千问 (Qwen)",
            "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "models": [
                {"id": "qwen-turbo", "name": "Qwen Turbo"},
                {"id": "qwen-plus", "name": "Qwen Plus"},
                {"id": "qwen-max", "name": "Qwen Max"},
                {"id": "qwen-long", "name": "Qwen Long"},
                {"id": "qwen2.5-72b-instruct", "name": "Qwen2.5-72B"},
                {"id": "qwen2.5-32b-instruct", "name": "Qwen2.5-32B"},
                {"id": "qwen2.5-14b-instruct", "name": "Qwen2.5-14B"},
                {"id": "qwen2.5-7b-instruct", "name": "Qwen2.5-7B"},
            ]
        },
        "kimi": {
            "name": "Kimi (Moonshot)",
            "base_url": "https://api.moonshot.cn/v1",
            "models": [
                {"id": "moonshot-v1-8k", "name": "Moonshot V1 8K"},
                {"id": "moonshot-v1-32k", "name": "Moonshot V1 32K"},
                {"id": "moonshot-v1-128k", "name": "Moonshot V1 128K"},
            ]
        },
        "minimax": {
            "name": "MiniMax",
            "base_url": "https://api.minimax.chat/v1",
            "models": [
                {"id": "MiniMax-Text-01", "name": "MiniMax-Text-01"},
                {"id": "abab6.5s-chat", "name": "ABAB 6.5s"},
                {"id": "abab6.5-chat", "name": "ABAB 6.5"},
                {"id": "abab6.5g-chat", "name": "ABAB 6.5G"},
            ]
        },
        "deepseek": {
            "name": "DeepSeek",
            "base_url": "https://api.deepseek.com/v1",
            "models": [
                {"id": "deepseek-chat", "name": "DeepSeek Chat"},
                {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner"},
            ]
        },
    }

    async def get_available_models(self) -> List[Dict[str, str]]:
        """获取可用模型列表"""
        config = self._load_config()
        provider = config.get("provider", "openai")
        
        if provider == "ollama":
            try:
                base_url = config.get("ollama_base_url", settings.OLLAMA_BASE_URL)
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{base_url}/api/tags", timeout=10.0)
                    response.raise_for_status()
                    data = response.json()
                    models = data.get("models", [])
                    return [{"id": m.get("name"), "name": m.get("name")} for m in models]
            except Exception as e:
                return [{"id": "llama3.1", "name": "llama3.1 (default)"}]
        else:
            # 根据提供商返回预设模型列表
            preset = self.PROVIDER_PRESETS.get(provider, self.PROVIDER_PRESETS.get("openai"))
            return preset["models"]


# 全局 AI 服务实例
ai_service = AIService()
