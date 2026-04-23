import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Select, Button, Space, Popover, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import Papa from 'papaparse';
import { SensorTimeseriesAnnotation } from '../../types';

const DEFAULT_LABELS = [
  { name: '正常', color: '#52c41a' },
  { name: '异常', color: '#faad14' },
  { name: '检修', color: '#1890ff' },
  { name: '报警', color: '#ff4d4f' },
];

interface SensorTimeseriesAnnotatorProps {
  content: {
    format: 'csv' | 'json';
    raw: string;
    config?: {
      timestampColumn?: string;
      sensorColumns?: string[];
    };
  };
  config?: {
    labelSets?: Array<{ name: string; color: string }>;
  };
  value: SensorTimeseriesAnnotation | null;
  onChange: (value: SensorTimeseriesAnnotation) => void;
}

interface ParsedData {
  timestamps: string[];
  sensors: Record<string, number[]>;
  sensorNames: string[];
}

interface SelectionRange {
  startIndex: number;
  endIndex: number;
  startTime: string;
  endTime: string;
}

const SensorTimeseriesAnnotator: React.FC<SensorTimeseriesAnnotatorProps> = ({
  content,
  config = {},
  value,
  onChange,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [annotations, setAnnotations] = useState<SensorTimeseriesAnnotation['annotations']>([]);

  // Initialize annotations from value
  useEffect(() => {
    if (value?.annotations) {
      setAnnotations(value.annotations);
    }
  }, [value]);

  // Parse data content
  useEffect(() => {
    if (!content?.raw) return;

    const parseData = () => {
      try {
        if (content.format === 'csv') {
          const result = Papa.parse(content.raw, { header: true });
          const rows = result.data as Record<string, string>[];
          if (rows.length === 0) return;

          const timestampCol = content.config?.timestampColumn || 'timestamp';
          const sensorCols = content.config?.sensorColumns || Object.keys(rows[0]).filter(k => k !== timestampCol);

          const timestamps: string[] = [];
          const sensors: Record<string, number[]> = {};

          sensorCols.forEach(col => { sensors[col] = []; });

          rows.forEach(row => {
            timestamps.push(row[timestampCol] || '');
            sensorCols.forEach(col => {
              sensors[col].push(parseFloat(row[col]) || 0);
            });
          });

          const parsed: ParsedData = { timestamps, sensors, sensorNames: sensorCols };
          setParsedData(parsed);
          if (sensorCols.length > 0) setSelectedSensor(sensorCols[0]);
        } else if (content.format === 'json') {
          const data = JSON.parse(content.raw);
          const timestamps: string[] = [];
          const sensors: Record<string, number[]> = {};
          let sensorNames: string[] = [];

          if (Array.isArray(data) && data.length > 0) {
            const timestampCol = content.config?.timestampColumn || 'timestamp';
            sensorNames = content.config?.sensorColumns || Object.keys(data[0]).filter(k => k !== timestampCol);
            sensorNames.forEach(col => { sensors[col] = []; });

            data.forEach((item: Record<string, any>) => {
              timestamps.push(item[timestampCol] || '');
              sensorNames.forEach(col => {
                sensors[col].push(parseFloat(item[col]) || 0);
              });
            });
          }

          const parsed: ParsedData = { timestamps, sensors, sensorNames };
          setParsedData(parsed);
          if (sensorNames.length > 0) setSelectedSensor(sensorNames[0]);
        }
      } catch (err) {
        console.error('Failed to parse data:', err);
        message.error('数据解析失败');
      }
    };

    parseData();
  }, [content]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || !parsedData || !selectedSensor) return;

    let chart = chartInstanceRef.current;
    if (!chart) {
      if (!chartRef.current) return;
      chart = echarts.init(chartRef.current);
      chartInstanceRef.current = chart;
    }

    const { timestamps, sensors } = parsedData;
    const values = sensors[selectedSensor] || [];

    // Prepare chart data - convert time strings to Date objects for ECharts
    const chartData = timestamps.map((t, i) => [new Date(t), values[i]]);

    // Prepare markArea for annotations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markAreaData: any[] = annotations
      .filter(ann => ann.sensor === selectedSensor)
      .map(ann => {
        const labelConfig = (config.labelSets || DEFAULT_LABELS).find(l => l.name === ann.label);
        const color = labelConfig?.color || '#999';
        return [
          { xAxis: ann.startTime, itemStyle: { color, opacity: 0.3 } },
          { xAxis: ann.endTime }
        ];
      });

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const p = params[0];
          return `${p.value[0]}<br/>${selectedSensor}: ${p.value[1]}`;
        }
      },
      toolbox: {
        feature: {
          brush: {
            type: ['rect', 'lineX', 'lineY', 'clear'],
            title: {
              rect: '矩形选择',
              lineX: '横向选择',
              lineY: '纵向选择',
              clear: '清除选择'
            }
          },
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: '缩放',
              back: '还原'
            }
          }
        },
        right: 20,
        top: 10
      },
      brush: {
        toolbox: ['rect', 'lineX', 'lineY'],
        xAxisIndex: 0,
        brushStyle: {
          color: 'rgba(24, 144, 255, 0.2)',
          borderColor: '#1890ff'
        }
      },
      legend: {
        data: [selectedSensor],
        top: 10
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
          }
        }
      },
      yAxis: {
        type: 'value'
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100 }
      ],
      series: [{
        name: selectedSensor,
        type: 'line',
        data: chartData,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.1 },
        markArea: {
          silent: false,
          emphasis: {
            itemStyle: { opacity: 0.5 }
          },
          data: markAreaData
        }
      }]
    };

    chart.setOption(option);

    // Handle brush selection - only on brushEnd
    const handleBrush = () => {
      // Do nothing during brush, only on brushEnd
    };

    const handleBrushEnd = (params: any) => {
      if (!params.areas || params.areas.length === 0) return;
      const area = params.areas[0];
      if (!area.coordRange) return;

      const [startIdx, endIdx] = area.coordRange;
      if (startIdx === endIdx) return; // Ignore zero-width selection

      const startTime = timestamps[Math.floor(startIdx)] || timestamps[0];
      const endTime = timestamps[Math.floor(endIdx)] || timestamps[timestamps.length - 1];
      setSelection({
        startIndex: Math.floor(startIdx),
        endIndex: Math.floor(endIdx),
        startTime,
        endTime
      });
      setPopoverVisible(true);
    };

    // Handle click on annotation to edit/delete
    const handleClick = (params: any) => {
      if (params.componentType === 'markArea') {
        const annIndex = annotations.findIndex(
          a => a.sensor === selectedSensor &&
               a.startTime === params.data[0].xAxis &&
               a.endTime === params.data[1].xAxis
        );
        if (annIndex >= 0) {
          const ann = annotations[annIndex];
          if (window.confirm(`删除标注: ${ann.label} (${ann.startTime} - ${ann.endTime})?`)) {
            const newAnnotations = annotations.filter((_, i) => i !== annIndex);
            setAnnotations(newAnnotations);
            onChange({ annotations: newAnnotations });
          }
        }
      }
    };

    chart.off('brush', handleBrush);
    chart.off('brushEnd', handleBrushEnd);
    chart.off('click', handleClick);
    chart.on('brush', handleBrush);
    chart.on('brushEnd', handleBrushEnd);
    chart.on('click', handleClick);

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [parsedData, selectedSensor, annotations, config.labelSets]);

  const handleLabelSelect = (label: string) => {
    if (!selection) return;

    const newAnnotation = {
      id: `ann_${Date.now()}`,
      startTime: selection.startTime,
      endTime: selection.endTime,
      label,
      sensor: selectedSensor,
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    onChange({ annotations: newAnnotations });
    setSelection(null);
    setPopoverVisible(false);
    message.success('标注已添加');
  };

  const labelPickerContent = (
    <div style={{ minWidth: 150 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>选择标签</div>
      <Space direction="vertical" style={{ width: '100%' }}>
        {(config.labelSets || DEFAULT_LABELS).map(label => (
          <Button
            key={label.name}
            block
            style={{
              backgroundColor: label.color,
              borderColor: label.color,
              color: '#fff',
              textAlign: 'left'
            }}
            onClick={() => handleLabelSelect(label.name)}
          >
            {label.name}
          </Button>
        ))}
      </Space>
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <span>传感器:</span>
          <Select
            value={selectedSensor}
            onChange={setSelectedSensor}
            style={{ width: 200 }}
            disabled={!parsedData?.sensorNames.length}
          >
            {parsedData?.sensorNames.map(name => (
              <Select.Option key={name} value={name}>{name}</Select.Option>
            ))}
          </Select>
        </Space>
      </div>

      <div ref={chartRef} style={{ width: '100%', height: 400, flexShrink: 0 }} />

      {selection && (
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            padding: '12px 16px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 250
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 500, textAlign: 'center' }}>
            区间: {selection.startTime} ~ {selection.endTime}
          </div>
          <Space>
            {(config.labelSets || DEFAULT_LABELS).map(label => (
              <Button
                key={label.name}
                style={{
                  backgroundColor: label.color,
                  borderColor: label.color,
                  color: '#fff'
                }}
                onClick={() => handleLabelSelect(label.name)}
              >
                {label.name}
              </Button>
            ))}
            <Button onClick={() => { setSelection(null); setPopoverVisible(false); }}>
              取消
            </Button>
          </Space>
        </div>
      )}

      <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', maxHeight: 150, overflowY: 'auto' }}>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>已添加标注 ({annotations.length})</div>
        {annotations.length === 0 ? (
          <div style={{ color: '#999' }}>暂无标注，使用图表工具栏的矩形选择工具拖拽选择区间添加标注</div>
        ) : (
          <Space wrap>
            {annotations.map(ann => (
              <div
                key={ann.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  backgroundColor: (config.labelSets || DEFAULT_LABELS).find(l => l.name === ann.label)?.color || '#999',
                  color: '#fff',
                  borderRadius: 4,
                  marginRight: 8,
                  marginBottom: 4
                }}
              >
                <span style={{ marginRight: 4 }}>{ann.label}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>({ann.sensor})</span>
                <DeleteOutlined
                  style={{ marginLeft: 8, cursor: 'pointer', fontSize: 12 }}
                  onClick={() => {
                    const newAnnotations = annotations.filter(a => a.id !== ann.id);
                    setAnnotations(newAnnotations);
                    onChange({ annotations: newAnnotations });
                  }}
                />
              </div>
            ))}
          </Space>
        )}
      </div>
    </div>
  );
};

export default SensorTimeseriesAnnotator;
