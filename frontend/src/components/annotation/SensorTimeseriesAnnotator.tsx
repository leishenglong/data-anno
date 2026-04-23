import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Select, Button, Space, Popover, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import Papa from 'papaparse';
import { SensorTimeseriesAnnotation } from '../../types';

interface SensorTimeseriesAnnotatorProps {
  content: {
    format: 'csv' | 'json';
    raw: string;
    config?: {
      timestampColumn?: string;
      sensorColumns?: string[];
    };
  };
  config: {
    labelSets: Array<{ name: string; color: string }>;
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
  config,
  value,
  onChange,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [labelPickerVisible, setLabelPickerVisible] = useState(false);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
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

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || !parsedData) return;

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    return () => {
      chart.dispose();
    };
  }, [parsedData]);

  // Update chart when selections change
  useEffect(() => {
    if (!chartInstanceRef.current || !parsedData || !selectedSensor) return;

    const chart = chartInstanceRef.current;
    const { timestamps, sensors } = parsedData;
    const values = sensors[selectedSensor] || [];

    // Prepare chart data
    const chartData = timestamps.map((t, i) => [t, values[i]]);

    // Prepare markArea for annotations
    const markAreaData: echarts.SeriesLineSeriesMarkAreaDataObject[] = annotations
      .filter(ann => ann.sensor === selectedSensor)
      .map(ann => {
        const labelConfig = config.labelSets.find(l => l.name === ann.label);
        const color = labelConfig?.color || '#999';
        return [
          { xAxis: ann.startTime, itemStyle: { color, opacity: 0.3 } },
          { xAxis: ann.endTime }
        ] as echarts.SeriesLineSeriesMarkAreaDataObject;
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
      legend: {
        data: [selectedSensor],
        top: 10
      },
      toolbox: {
        right: 20,
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: '区域缩放',
              back: '还原'
            }
          },
          brush: {
            type: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'],
            title: {
              rect: '矩形选择',
              polygon: '圈选',
              lineX: '横向选择',
              lineY: '纵向选择',
              keep: '保持选择',
              clear: '清除选择'
            }
          }
        }
      },
      brush: {
        toolbox: ['rect', 'polygon'],
        xAxisIndex: 0,
        outOfBrush: { colorAlpha: 0.3 }
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

    // Handle brush selection
    chart.on('brush', (params: any) => {
      if (params.areas && params.areas.length > 0) {
        const area = params.areas[0];
        if (area.coordRange) {
          const [startIdx, endIdx] = area.coordRange;
          const startTime = timestamps[Math.floor(startIdx)] || timestamps[0];
          const endTime = timestamps[Math.floor(endIdx)] || timestamps[timestamps.length - 1];
          setSelection({
            startIndex: Math.floor(startIdx),
            endIndex: Math.floor(endIdx),
            startTime,
            endTime
          });
          setLabelPickerVisible(true);
        }
      }
    });

    // Handle click on annotation to edit/delete
    chart.on('click', (params: any) => {
      if (params.componentType === 'markArea') {
        const annIndex = annotations.findIndex(
          a => a.sensor === selectedSensor &&
               a.startTime === params.data[0].xAxis &&
               a.endTime === params.data[1].xAxis
        );
        if (annIndex >= 0) {
          // Show delete confirmation
          const ann = annotations[annIndex];
          if (window.confirm(`删除标注: ${ann.label} (${ann.startTime} - ${ann.endTime})?`)) {
            const newAnnotations = annotations.filter((_, i) => i !== annIndex);
            setAnnotations(newAnnotations);
            onChange({ annotations: newAnnotations });
          }
        }
      }
    });

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
    setLabelPickerVisible(false);
    setSelection(null);
    setPopoverVisible(false);
    message.success('标注已添加');
  };

  const labelPickerContent = (
    <div style={{ minWidth: 150 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>选择标签</div>
      <Space direction="vertical" style={{ width: '100%' }}>
        {config.labelSets.map(label => (
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
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

      <div ref={chartRef} style={{ flex: 1, minHeight: 400 }} />

      {selection && (
        <Popover
          content={labelPickerContent}
          title={`区间: ${selection.startTime} ~ ${selection.endTime}`}
          trigger="click"
          open={popoverVisible}
          onOpenChange={setPopoverVisible}
        >
          <div style={{ display: 'none' }} />
        </Popover>
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
                  backgroundColor: config.labelSets.find(l => l.name === ann.label)?.color || '#999',
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
