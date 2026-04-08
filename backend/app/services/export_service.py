import json
import csv
import io
from typing import List, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Dataset, DataItem, Annotation


class ExportService:
    """数据导出服务"""
    
    SUPPORTED_FORMATS = ['json', 'jsonl', 'csv', 'alpaca', 'sharegpt']
    
    async def export_dataset(self, db: AsyncSession, dataset_id: int, format: str) -> tuple[bytes, str]:
        """
        导出数据集的标注结果
        
        Args:
            db: 数据库会话
            dataset_id: 数据集ID
            format: 导出格式 (json, jsonl, csv, alpaca, sharegpt)
            
        Returns:
            tuple: (文件内容 bytes, 文件扩展名)
        """
        if format not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported format: {format}. Supported: {self.SUPPORTED_FORMATS}")
        
        # 查询数据集所有已标注的数据项及其标注
        result = await db.execute(
            select(DataItem)
            .options(selectinload(DataItem.annotations))
            .where(DataItem.dataset_id == dataset_id)
            .where(DataItem.status.in_(['annotated', 'reviewed']))
            .order_by(DataItem.order_index)
        )
        items = result.scalars().all()
        
        if not items:
            raise ValueError("No annotated items found in dataset")
        
        # 根据格式导出
        if format == 'json':
            content = self._to_json(items)
            ext = 'json'
        elif format == 'jsonl':
            content = self._to_jsonl(items)
            ext = 'jsonl'
        elif format == 'csv':
            content = self._to_csv(items)
            ext = 'csv'
        elif format == 'alpaca':
            content = self._to_alpaca(items)
            ext = 'json'
        elif format == 'sharegpt':
            content = self._to_sharegpt(items)
            ext = 'json'
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        # 转换为 bytes
        if isinstance(content, str):
            content_bytes = content.encode('utf-8')
        else:
            content_bytes = content
            
        return content_bytes, ext
    
    def _extract_text_from_content(self, content: dict) -> str:
        """从内容中提取文本"""
        if isinstance(content, dict):
            # 尝试常见的文本字段
            for key in ['text', 'content', 'prompt', 'input', 'question', 'message']:
                if key in content:
                    value = content[key]
                    if isinstance(value, str):
                        return value
            # 如果没有找到，返回第一个字符串值
            for value in content.values():
                if isinstance(value, str):
                    return value
            # 返回 JSON 字符串
            return json.dumps(content, ensure_ascii=False)
        return str(content)
    
    def _extract_annotation_result(self, item: DataItem) -> dict:
        """提取标注结果"""
        if not item.annotations:
            return {}
        
        # 获取最新的一条标注
        annotation = sorted(
            item.annotations, 
            key=lambda a: a.updated_at or a.created_at, 
            reverse=True
        )[0]
        
        return {
            'annotation_id': annotation.id,
            'annotation_type': annotation.annotation_type,
            'content': annotation.content,
            'is_ai_generated': annotation.is_ai_generated,
            'review_status': annotation.review_status,
        }
    
    def _to_json(self, items: List[DataItem]) -> str:
        """导出为 JSON 格式"""
        export_data = []
        for item in items:
            record = {
                'id': item.id,
                'content': item.content,
                'meta_data': item.meta_data,
                'status': item.status,
                'annotation': self._extract_annotation_result(item),
            }
            export_data.append(record)
        
        return json.dumps(export_data, ensure_ascii=False, indent=2)
    
    def _to_jsonl(self, items: List[DataItem]) -> str:
        """导出为 JSONL 格式（每行一个 JSON）"""
        lines = []
        for item in items:
            record = {
                'id': item.id,
                'content': item.content,
                'meta_data': item.meta_data,
                'status': item.status,
                'annotation': self._extract_annotation_result(item),
            }
            lines.append(json.dumps(record, ensure_ascii=False))
        
        return '\n'.join(lines)
    
    def _to_csv(self, items: List[DataItem]) -> str:
        """导出为 CSV 格式"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # 写入表头
        writer.writerow(['id', 'text', 'annotation_type', 'annotation_content', 'meta_data', 'status'])
        
        for item in items:
            text = self._extract_text_from_content(item.content)
            annotation = self._extract_annotation_result(item)
            
            writer.writerow([
                item.id,
                text,
                annotation.get('annotation_type', ''),
                json.dumps(annotation.get('content', {}), ensure_ascii=False) if annotation else '',
                json.dumps(item.meta_data, ensure_ascii=False),
                item.status,
            ])
        
        # 添加 UTF-8 BOM 以支持 Excel 打开中文
        content = output.getvalue()
        return '\ufeff' + content
    
    def _to_alpaca(self, items: List[DataItem]) -> str:
        """
        导出为 Alpaca 训练格式
        { "instruction": "...", "input": "...", "output": "..." }
        """
        export_data = []
        
        for item in items:
            content = item.content
            annotation = self._extract_annotation_result(item)
            
            # 尝试从内容中提取 instruction/input
            instruction = ''
            input_text = ''
            
            if isinstance(content, dict):
                instruction = content.get('instruction', '') or content.get('prompt', '')
                input_text = content.get('input', '') or content.get('question', '') or content.get('text', '')
            
            # 如果没有提取到，使用整个内容作为 input
            if not input_text and not instruction:
                input_text = self._extract_text_from_content(content)
            
            # 提取 output 从标注内容
            output = ''
            if annotation and annotation.get('content'):
                ann_content = annotation['content']
                if isinstance(ann_content, dict):
                    # 尝试提取标注结果
                    if 'label' in ann_content:
                        output = str(ann_content['label'])
                    elif 'labels' in ann_content:
                        output = json.dumps(ann_content['labels'], ensure_ascii=False)
                    elif 'entities' in ann_content:
                        output = json.dumps(ann_content['entities'], ensure_ascii=False)
                    elif 'answer' in ann_content:
                        output = str(ann_content['answer'])
                    elif 'output' in ann_content:
                        output = str(ann_content['output'])
                    elif 'response' in ann_content:
                        output = str(ann_content['response'])
                    else:
                        output = json.dumps(ann_content, ensure_ascii=False)
                else:
                    output = str(ann_content)
            
            record = {
                'instruction': instruction,
                'input': input_text,
                'output': output,
                'meta_data': {
                    'item_id': item.id,
                    'annotation_type': annotation.get('annotation_type') if annotation else None,
                    'is_ai_generated': annotation.get('is_ai_generated') if annotation else None,
                }
            }
            export_data.append(record)
        
        return json.dumps(export_data, ensure_ascii=False, indent=2)
    
    def _to_sharegpt(self, items: List[DataItem]) -> str:
        """
        导出为 ShareGPT 对话格式
        { "conversations": [{ "from": "human", "value": "..." }, { "from": "gpt", "value": "..." }] }
        """
        export_data = []
        
        for item in items:
            content = item.content
            annotation = self._extract_annotation_result(item)
            
            conversations = []
            
            # 处理输入（human）
            human_value = ''
            if isinstance(content, dict):
                # 尝试构建对话格式
                if 'instruction' in content and 'input' in content:
                    human_value = f"{content['instruction']}\n\n{content['input']}"
                elif 'prompt' in content:
                    human_value = content['prompt']
                elif 'question' in content:
                    human_value = content['question']
                elif 'text' in content:
                    human_value = content['text']
                else:
                    human_value = json.dumps(content, ensure_ascii=False)
            else:
                human_value = str(content)
            
            conversations.append({
                'from': 'human',
                'value': human_value
            })
            
            # 处理输出（gpt/assistant）
            gpt_value = ''
            if annotation and annotation.get('content'):
                ann_content = annotation['content']
                if isinstance(ann_content, dict):
                    # 尝试提取标注结果作为回复
                    if 'response' in ann_content:
                        gpt_value = str(ann_content['response'])
                    elif 'answer' in ann_content:
                        gpt_value = str(ann_content['answer'])
                    elif 'output' in ann_content:
                        gpt_value = str(ann_content['output'])
                    elif 'label' in ann_content:
                        gpt_value = str(ann_content['label'])
                    elif 'labels' in ann_content:
                        gpt_value = json.dumps(ann_content['labels'], ensure_ascii=False)
                    elif 'entities' in ann_content:
                        entities = ann_content['entities']
                        if isinstance(entities, list):
                            gpt_value = '识别的实体: ' + ', '.join([
                                f"{e.get('text', '')}({e.get('label', '')})" 
                                for e in entities
                            ])
                        else:
                            gpt_value = json.dumps(entities, ensure_ascii=False)
                    else:
                        gpt_value = json.dumps(ann_content, ensure_ascii=False)
                else:
                    gpt_value = str(ann_content)
            
            conversations.append({
                'from': 'gpt',
                'value': gpt_value
            })
            
            record = {
                'conversations': conversations,
                'meta_data': {
                    'item_id': item.id,
                    'annotation_type': annotation.get('annotation_type') if annotation else None,
                    'is_ai_generated': annotation.get('is_ai_generated') if annotation else None,
                    'review_status': annotation.get('review_status') if annotation else None,
                }
            }
            export_data.append(record)
        
        return json.dumps(export_data, ensure_ascii=False, indent=2)


# 单例实例
export_service = ExportService()
