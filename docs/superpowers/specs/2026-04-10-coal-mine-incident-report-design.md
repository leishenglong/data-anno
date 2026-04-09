# 煤矿风险事件记录标注 - 设计方案

## 背景

煤矿安全监测数据标注系统第一批功能：风险事件记录标注。

**场景：** 标注矿难事故、安全隐患、设备故障等事件记录

## 功能范围

### 新增标注类型：incident_report

```json
{
  "type": "incident_report",
  "content": {
    "incident_type": "string",     // 事故类型
    "incident_level": "string",     // 等级：一般/较大/重大/特别重大
    "cause": "string",              // 原因分类
    "description": "string",        // 自由文本描述
    "attachments": [                // 附件（仅URL）
      {"type": "string", "url": "string"}
    ]
  }
}
```

## 数据模型

### 新增 Schema

```python
class IncidentReportContent(BaseModel):
    incident_type: str                           # 事故类型
    incident_level: str                          # 等级
    cause: str                                  # 原因
    description: Optional[str] = ""              # 描述
    attachments: List[Dict[str, str]] = []     # 附件URL列表
```

### 标签集配置

项目配置中定义可选值：

```json
{
  "incident_types": [
    "瓦斯突出", "瓦斯爆炸", "煤与瓦斯突出",
    "透水", "顶板事故", "机电事故", "运输事故", "其他"
  ],
  "incident_levels": ["一般", "较大", "重大", "特别重大"],
  "causes": [
    "地质构造", "违规操作", "设备故障", "自然因素", "管理缺陷", "其他"
  ]
}
```

## 标注界面

表单式界面：
- 事故类型：下拉选择
- 等级：下拉选择
- 原因：下拉选择
- 描述：多行文本输入框
- 附件：URL 输入框（可添加多个）

## 复用与扩展

- **复用：** annotation_workbench 框架、submitAnnotation API
- **扩展点：** 第二批（设备状态）、第三批（传感器时序）可复用附件机制

## 不改动范围

- UI 风格保持现有
- 现有标注类型不受影响
- AI 辅助标注暂不扩展到此类型

## 验收标准

1. 新建项目可选择 `incident_report` 类型
2. 标注工作台显示表单式界面
3. 提交后数据格式符合 Schema
4. 附件 URL 正确存储
5. 导出时包含 incident_report 类型数据
