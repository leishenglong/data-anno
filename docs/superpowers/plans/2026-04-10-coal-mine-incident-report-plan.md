# 煤矿风险事件记录标注 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `incident_report` 标注类型，支持煤矿风险事件记录的表单式标注

**Architecture:** 在现有标注系统基础上，新增 `incident_report` 类型，新增专用表单组件，复用现有 annotation_workbench 框架和 API

**Tech Stack:** Python/FastAPI (后端), React/TypeScript/Ant Design (前端)

---

## 文件映射

| 文件 | 改动 |
|------|------|
| `backend/app/schemas/annotation.py` | 新增 `IncidentReportContent` schema |
| `backend/app/services/ai_service.py` | 支持 `incident_report` 类型的 `_get_task_description` 和 `_get_strict_schema` |
| `frontend/src/types/index.ts` | 新增 `IncidentReportAnnotation` 类型 |
| `frontend/src/components/annotation/IncidentReportForm.tsx` | 新建：事件记录表单组件 |
| `frontend/src/components/annotation/index.ts` | 导出 `IncidentReportForm` |
| `frontend/src/pages/AnnotationWorkbench.tsx` | 在 `renderAnnotationPanel` 中添加 `incident_report` 分支 |
| `frontend/src/pages/ProjectCreate.tsx` | 在项目类型选择中添加 `incident_report` |

---

## Task 1: 后端 Schema 定义

**Files:**
- Modify: `backend/app/schemas/annotation.py`
- Modify: `backend/app/services/ai_service.py`

- [ ] **Step 1: 在 annotation.py 中添加 IncidentReportContent schema**

```python
class IncidentReportContent(BaseModel):
    incident_type: str = Field(..., description="事故类型")
    incident_level: str = Field(..., description="等级：一般/较大/重大/特别重大")
    cause: str = Field(..., description="原因分类")
    description: Optional[str] = Field("", description="自由文本描述")
    attachments: List[Dict[str, str]] = Field(default_factory=list, description="附件URL列表")
```

- [ ] **Step 2: 在 ai_service.py 的 `_get_task_description` 中添加 incident_report**

```python
"incident_report": "煤矿风险事件记录",
```

- [ ] **Step 3: 在 ai_service.py 的 `_get_strict_schema` 中添加 incident_report**

```python
"incident_report": '{"incident_type": "类型", "incident_level": "等级", "cause": "原因", "description": "描述", "attachments": []}',
```

- [ ] **Step 4: 验证后端代码**

```bash
cd backend && python -c "from app.schemas.annotation import IncidentReportContent; print('Schema OK')"
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/annotation.py backend/app/services/ai_service.py
git commit -m "feat(backend): add incident_report schema and AI service support"
```

---

## Task 2: 前端类型定义

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/components/annotation/IncidentReportForm.tsx`
- Modify: `frontend/src/components/annotation/index.ts`

- [ ] **Step 1: 在 types/index.ts 中添加 IncidentReportAnnotation 类型**

```typescript
export interface IncidentReportAnnotation {
  incident_type: string;
  incident_level: string;
  cause: string;
  description: string;
  attachments: Array<{ type: string; url: string }>;
}
```

- [ ] **Step 2: 创建 IncidentReportForm.tsx 组件**

```tsx
import React from 'react';
import { Form, Select, Input, Button, Space, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

interface IncidentReportFormProps {
  content: any;
  config: any;
  value: IncidentReportAnnotation | null;
  onChange: (value: IncidentReportAnnotation) => void;
}

const { TextArea } = Input;

const IncidentReportForm: React.FC<IncidentReportFormProps> = ({
  content,
  config,
  value,
  onChange,
}) => {
  const [form] = Form.useForm();

  // 从 config 中获取可选值
  const incidentTypes = config?.incident_types || [
    '瓦斯突出', '瓦斯爆炸', '煤与瓦斯突出',
    '透水', '顶板事故', '机电事故', '运输事故', '其他'
  ];
  const incidentLevels = config?.incident_levels || ['一般', '较大', '重大', '特别重大'];
  const causes = config?.causes || [
    '地质构造', '违规操作', '设备故障', '自然因素', '管理缺陷', '其他'
  ];

  // 初始化表单值
  React.useEffect(() => {
    if (value) {
      form.setFieldsValue(value);
    }
  }, [value]);

  const handleValuesChange = () => {
    const values = form.getFieldsValue();
    onChange(values);
  };

  const attachments = form.getFieldValue('attachments') || [];

  const addAttachment = () => {
    const newAttachments = [...attachments, { type: 'image', url: '' }];
    form.setFieldValue('attachments', newAttachments);
    handleValuesChange();
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_: any, i: number) => i !== index);
    form.setFieldValue('attachments', newAttachments);
    handleValuesChange();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleValuesChange}
    >
      <Form.Item
        name="incident_type"
        label="事故类型"
        rules={[{ required: true, message: '请选择事故类型' }]}
      >
        <Select placeholder="请选择">
          {incidentTypes.map(t => (
            <Select.Option key={t} value={t}>{t}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="incident_level"
        label="等级"
        rules={[{ required: true, message: '请选择等级' }]}
      >
        <Select placeholder="请选择">
          {incidentLevels.map(l => (
            <Select.Option key={l} value={l}>{l}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="cause"
        label="原因"
        rules={[{ required: true, message: '请选择原因' }]}
      >
        <Select placeholder="请选择">
          {causes.map(c => (
            <Select.Option key={c} value={c}>{c}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="description"
        label="描述"
      >
        <TextArea rows={4} placeholder="请输入事件描述..." />
      </Form.Item>

      <Form.Item label="附件">
        {attachments.map((att: any, index: number) => (
          <Space key={index} style={{ display: 'flex', marginBottom: 8 }}>
            <Select
              value={att.type}
              onChange={(val) => {
                attachments[index].type = val;
                handleValuesChange();
              }}
              style={{ width: 100 }}
            >
              <Select.Option value="image">图片</Select.Option>
              <Select.Option value="document">文档</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
            <Input
              placeholder="请输入URL"
              value={att.url}
              onChange={(e) => {
                attachments[index].url = e.target.value;
                handleValuesChange();
              }}
              style={{ flex: 1 }}
            />
            <DeleteOutlined onClick={() => removeAttachment(index)} />
          </Space>
        ))}
        <Button type="dashed" onClick={addAttachment} icon={<PlusOutlined />}>
          添加附件
        </Button>
      </Form.Item>
    </Form>
  );
};

export default IncidentReportForm;
```

- [ ] **Step 3: 在 index.ts 中导出 IncidentReportForm**

```typescript
export { default as IncidentReportForm } from './IncidentReportForm';
```

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/components/annotation/IncidentReportForm.tsx frontend/src/components/annotation/index.ts
git commit -m "feat(frontend): add IncidentReportForm component"
```

---

## Task 3: 集成到标注工作台

**Files:**
- Modify: `frontend/src/pages/AnnotationWorkbench.tsx`

- [ ] **Step 1: 导入 IncidentReportForm**

```typescript
import {
  TextClassifier,
  NERAnnotator,
  RelationAnnotator,
  DialogAnnotator,
  ScoreReviewer,
  IncidentReportForm,  // 新增
} from '@/components/annotation';
```

- [ ] **Step 2: 在 renderAnnotationPanel 中添加 incident_report 分支**

在 switch 语句中添加：

```typescript
case 'incident_report':
  return (
    <IncidentReportForm
      content={content}
      config={config}
      value={currentAnnotation}
      onChange={setCurrentAnnotation}
    />
  );
```

- [ ] **Step 3: 验证编译**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "AnnotationWorkbench"
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AnnotationWorkbench.tsx
git commit -m "feat(frontend): integrate IncidentReportForm into AnnotationWorkbench"
```

---

## Task 4: 项目创建页面支持

**Files:**
- Modify: `frontend/src/pages/ProjectCreate.tsx`

- [ ] **Step 1: 在标注类型列表中添加 incident_report**

找到标注类型列表，添加：

```typescript
{ key: 'incident_report', label: '风险事件记录', description: '煤矿风险事件记录标注' },
```

- [ ] **Step 2: 验证编译**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProjectCreate"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ProjectCreate.tsx
git commit -m "feat(frontend): add incident_report to project type options"
```

---

## Task 5: 测试验证

**Files:**
- 使用 `test-data/incident_report.json` 测试数据

- [ ] **Step 1: 创建测试数据**

```json
[
  {
    "text": "2024年3月15日，某煤矿发生瓦斯突出事故，造成2人死亡。"
  },
  {
    "text": "2024年4月1日，井下皮带运输机发生故障，导致生产暂停2小时。"
  }
]
```

- [ ] **Step 2: 启动后端验证 Schema**

```bash
cd backend && python -c "
from app.schemas.annotation import IncidentReportContent
data = {
    'incident_type': '瓦斯突出',
    'incident_level': '重大',
    'cause': '地质构造',
    'description': '测试描述',
    'attachments': [{'type': 'image', 'url': 'http://example.com/photo.jpg'}]
}
result = IncidentReportContent(**data)
print('Schema validation OK:', result.incident_type)
"
```

- [ ] **Step 3: 验证前端编译**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add test-data/incident_report.json
git commit -m "test: add incident_report test data"
```

---

## 验收标准

1. ✅ 后端 Schema `IncidentReportContent` 验证通过
2. ✅ 前端 `IncidentReportForm` 组件编译无错误
3. ✅ 标注工作台可显示 incident_report 类型
4. ✅ 项目创建页面可选 incident_report 类型
5. ✅ 表单提交返回正确的数据格式
