# 传感器时序数据标注实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持 CSV/JSON/API 三种数据源的时序传感器数据波形可视化与区间标注

**Architecture:**
- 前端新增 `SensorTimeseriesAnnotator` 组件，使用 ECharts 渲染波形图，鼠标拖拽选择区间进行标注
- 后端复用现有 Annotation/DataItem 模型，标注结果存为 JSON
- 前端解析原始文件（Papaparse 解析 CSV），不依赖后端转换

**Tech Stack:** ECharts, Papaparse, React

---

## 文件结构

```
frontend/src/
├── components/annotation/
│   └── SensorTimeseriesAnnotator.tsx   # 新增：主组件
├── types/index.ts                       # 修改：添加 sensor_timeseries 类型
├── pages/ProjectCreate.tsx              # 修改：支持配置标签集

backend/app/
├── routers/annotations.py                # 修改：支持 sensor_timeseries
├── schemas/annotation.py                # 修改：添加 SensorTimeseriesContent schema
```

---

## Task 1: 添加类型定义

**Files:**
- Modify: `frontend/src/types/index.ts:1-108`

- [ ] **Step 1: 在 ANNOTATION_TYPE_CONFIG 添加 sensor_timeseries**

在 `ANNOTATION_TYPE_CONFIG` 中添加：

```typescript
sensor_timeseries: {
  label: '时序传感器',
  description: '时序传感器数据标注',
  icon: 'LineChartOutlined',
},
```

- [ ] **Step 2: 添加 SensorTimeseriesAnnotation 类型定义**

```typescript
export interface SensorTimeseriesAnnotation {
  annotations: Array<{
    id: string;
    startTime: string;
    endTime: string;
    label: string;
    sensor: string;
    note?: string;
  }>;
}
```

- [ ] **Step 3: 更新 AnnotationType 类型**

```typescript
export type AnnotationType = 'text_classification' | 'ner' | 'relation_extraction' | 'dialog' | 'score_review' | 'incident_report' | 'sensor_timeseries';
```

---

## Task 2: 创建 SensorTimeseriesAnnotator 组件

**Files:**
- Create: `frontend/src/components/annotation/SensorTimeseriesAnnotator.tsx`
- Modify: `frontend/src/components/annotation/index.ts`

- [ ] **Step 1: 创建基础组件结构**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import {
  Card,
  Button,
  Space,
  Tag,
  Select,
  Tooltip,
  Popover,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { SensorTimeseriesAnnotation } from '@/types';

interface SensorTimeseriesAnnotatorProps {
  content: any;  // 原始数据
  config: any;   // 项目配置 (labelSets, sensorColumns 等)
  value: SensorTimeseriesAnnotation | null;
  onChange: (value: SensorTimeseriesAnnotation) => void;
}

interface ParsedData {
  timestamps: string[];
  sensors: Record<string, number[]>;
  sensorList: string[];
}

const SensorTimeseriesAnnotator: React.FC<SensorTimeseriesAnnotatorProps> = ({
  content,
  config,
  value,
  onChange,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string>('');
  const [annotations, setAnnotations] = useState<any[]>([]);

  // 解析数据 (CSV/JSON)
  // 渲染 ECharts 波形图
  // 处理区间选择
  // 处理标注
};

export default SensorTimeseriesAnnotator;
```

- [ ] **Step 2: 实现数据解析函数**

添加 `parseRawData` 函数，解析 content.raw 或 content：

```typescript
const parseRawData = (content: any): ParsedData => {
  // content.format: 'csv' | 'json' | 'api'
  // content.raw: 原始内容
  // content.config: { timestampColumn, sensorColumns }
  // ...
};
```

- [ ] **Step 3: 实现 ECharts 波形图渲染**

初始化 ECharts 实例，设置时序图表配置：
- X轴: 时间轴
- Y轴: 数值
- 数据缩放: dataZoom
- 标注层: markArea

- [ ] **Step 4: 实现区间选择交互**

鼠标拖拽在波形图上选择区间，弹出标签选择器。

- [ ] **Step 5: 实现标注管理**

添加/修改/删除标注，更新 onChange。

- [ ] **Step 6: 导出组件**

在 `index.ts` 添加导出。

---

## Task 3: 集成到 AnnotationWorkbench

**Files:**
- Modify: `frontend/src/pages/AnnotationWorkbench.tsx:459-513`

- [ ] **Step 1: 导入 SensorTimeseriesAnnotator**

```typescript
import {
  TextClassifier,
  NERAnnotator,
  RelationAnnotator,
  DialogAnnotator,
  ScoreReviewer,
  IncidentReportForm,
  SensorTimeseriesAnnotator,  // 新增
} from '@/components/annotation';
```

- [ ] **Step 2: 添加 case 分支**

在 `renderAnnotationPanel` 的 switch 中添加：

```typescript
case 'sensor_timeseries':
  return (
    <SensorTimeseriesAnnotator
      content={content}
      config={config}
      value={currentAnnotation}
      onChange={setCurrentAnnotation}
    />
  );
```

---

## Task 4: 后端支持

**Files:**
- Modify: `backend/app/schemas/annotation.py`
- Modify: `backend/app/routers/annotations.py`

- [ ] **Step 1: 添加 SensorTimeseriesContent schema**

```python
class SensorTimeseriesContent(BaseModel):
    annotations: List[Dict[str, Any]] = Field(default_factory=list)
```

- [ ] **Step 2: 确保 API 正常**

现有 API 已支持 JSON 格式的 content，复用 Annotation 模型即可，无需大改。

---

## Task 5: 项目创建支持标签配置

**Files:**
- Modify: `frontend/src/pages/ProjectCreate.tsx`

- [ ] **Step 1: 在 incident_report 步骤中添加 sensor_timeseries 支持**

参考 incident_report 的配置方式，添加标签集配置 UI：
- 可添加/删除标签
- 颜色选择
- 默认标签: 正常(绿)、异常(黄)、检修(蓝)、报警(红)

---

## Task 6: 测试验证

- [ ] **Step 1: 启动前端开发服务器**

`cd frontend && npm run dev`

- [ ] **Step 2: 创建测试数据**

创建 CSV 文件:
```csv
timestamp,temperature,pressure,gas_level
2024-01-01 00:00:00,25.5,101.3,0.02
2024-01-01 00:00:01,25.6,101.3,0.02
```

- [ ] **Step 3: 创建 sensor_timeseries 项目，配置标签**

- [ ] **Step 4: 上传数据，验证波形图渲染**

- [ ] **Step 5: 测试区间选择和标注**

- [ ] **Step 6: 提交标注，刷新验证**

---

## 自检清单

- [ ] sensor_timeseries 已添加到 AnnotationType
- [ ] SensorTimeseriesAnnotator 组件已创建并导出
- [ ] AnnotationWorkbench 已集成新组件
- [ ] ECharts 波形图正常显示
- [ ] 区间选择和标注功能正常
- [ ] 标签可配置
- [ ] 标注结果可保存和加载
