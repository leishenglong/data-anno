# 传感器时序数据标注设计方案

## 1. 概述

**功能**：支持 CSV/JSON/API 三种数据源的时序传感器数据波形可视化与区间标注。

**标注类型名**：`sensor_timeseries`

## 2. 数据格式

### 2.1 导入格式

**CSV 示例**：
```csv
timestamp,temperature,pressure,gas_level
2024-01-01 00:00:00,25.5,101.3,0.02
2024-01-01 00:00:01,25.6,101.3,0.02
```

**JSON 示例**：
```json
[
  {"timestamp": "2024-01-01 00:00:00", "temperature": 25.5, "pressure": 101.3, "gas_level": 0.02},
  {"timestamp": "2024-01-01 00:00:01", "temperature": 25.6, "pressure": 101.3, "gas_level": 0.02}
]
```

**API**：配置 URL，返回 CSV/JSON 格式数据。

### 2.2 内部存储

原始文件/数据存于 `DataItem.content`，前端负责解析：

```json
{
  "format": "csv" | "json" | "api",
  "raw": "原始内容或API URL",
  "config": {
    "timestampColumn": "timestamp",
    "sensorColumns": ["temperature", "pressure", "gas_level"]
  }
}
```

### 2.3 标注结果

```json
{
  "annotations": [
    {
      "id": "uuid",
      "startTime": "2024-01-01 00:05:00",
      "endTime": "2024-01-01 00:10:00",
      "label": "异常",
      "sensor": "gas_level",
      "note": ""
    }
  ]
}
```

## 3. 项目配置

`Project.config` 结构：

```json
{
  "labelSets": [
    {"name": "正常", "color": "#52c41a"},
    {"name": "异常", "color": "#faad14"},
    {"name": "检修", "color": "#1890ff"},
    {"name": "报警", "color": "#ff4d4f"}
  ]
}
```

标签可在项目设置中动态增删。

## 4. 组件结构

```
components/annotation/
└── SensorTimeseriesAnnotator.tsx   # 主组件

SensorTimeseriesAnnotator 内部：
├── SensorWaveform          # ECharts 波形图画布
├── SensorSelector          # 传感器通道选择
├── AnnotationLayer         # 区间标注覆盖层
└── LabelPalette            # 标签选择弹窗
```

## 5. 交互设计

### 5.1 波形图
- ECharts 渲染，支持大数据量
- X轴：时间，Y轴：传感器数值
- 多条曲线可叠加/单独显示
- 鼠标滚轮缩放，拖拽平移

### 5.2 标注操作
- 鼠标拖拽选择区间 → 弹出标签选择 → 点击确认
- 已标注区间显示彩色覆盖层，悬停显示标签信息
- 点击区间可修改/删除

### 5.3 快捷操作
- 快捷键：按数字键快速标注当前选中的区间
- 双击区间：编辑/删除

## 6. 审核功能

- 审核页面显示所有标注区间列表
- 支持批量通过/驳回
- 驳回时可填写意见

## 7. 技术选型

- **波形图**：ECharts（大数据量性能好）
- **CSV 解析**：Papaparse
- **拖拽选择**：原生 mouse 事件

## 8. 实现计划

1. 新增 `sensor_timeseries` 标注类型
2. 创建 `SensorTimeseriesAnnotator.tsx` 组件
3. 添加 ECharts 波形图
4. 实现区间选择和标注
5. 支持标签配置和动态增删
6. 审核功能
