import React from 'react';
import { Tag, Space, Typography, Radio, Checkbox } from 'antd';
import type { ProjectConfig } from '@/types';

const { Text } = Typography;

interface TextClassifierProps {
  content: any;
  config: ProjectConfig;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
}

const TextClassifier: React.FC<TextClassifierProps> = ({
  content,
  config,
  value,
  onChange,
}) => {
  const labels = config.labels || [];
  
  // 判断是单选还是多选模式（默认单选）
  const isMultiSelect = config.max_score !== undefined && config.max_score > 1;
  
  // 获取显示的文本内容
  const getTextContent = () => {
    if (typeof content === 'string') return content;
    if (content.text) return content.text;
    return JSON.stringify(content);
  };

  const handleSingleChange = (selectedLabel: string) => {
    onChange(selectedLabel);
  };

  const handleMultiChange = (checkedValues: string[]) => {
    onChange(checkedValues);
  };

  return (
    <div style={{ padding: 16 }}>
      {/* 文本内容展示 */}
      <div
        style={{
          padding: 20,
          background: '#f6ffed',
          borderRadius: 8,
          border: '1px solid #b7eb8f',
          fontSize: 16,
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
          marginBottom: 24,
        }}
      >
        {getTextContent()}
      </div>

      {/* 标签选择区域 */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 16 }}>
          选择标签：
        </Text>
        
        {isMultiSelect ? (
          // 多选模式
          <Checkbox.Group
            value={Array.isArray(value) ? value : value ? [value] : []}
            onChange={handleMultiChange}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {labels.map((label) => (
                <Checkbox key={label.name} value={label.name}>
                  <Tag
                    color={label.color}
                    style={{
                      fontSize: 14,
                      padding: '4px 12px',
                      marginLeft: 8,
                    }}
                  >
                    {label.name}
                  </Tag>
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        ) : (
          // 单选模式
          <Radio.Group
            value={value}
            onChange={(e) => handleSingleChange(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {labels.map((label) => (
                <Radio key={label.name} value={label.name}>
                  <Tag
                    color={label.color}
                    style={{
                      fontSize: 14,
                      padding: '4px 12px',
                      marginLeft: 8,
                    }}
                  >
                    {label.name}
                  </Tag>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}

        {labels.length === 0 && (
          <Text type="secondary">暂无可用标签，请在项目配置中添加</Text>
        )}
      </div>

      {/* 已选标签展示 */}
      {value && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            已选标签：
          </Text>
          <Space wrap>
            {Array.isArray(value) ? (
              value.map((v) => {
                const label = labels.find((l) => l.name === v);
                return (
                  <Tag key={v} color={label?.color || 'default'}>
                    {v}
                  </Tag>
                );
              })
            ) : (
              (() => {
                const label = labels.find((l) => l.name === value);
                return (
                  <Tag color={label?.color || 'default'}>
                    {value}
                  </Tag>
                );
              })()
            )}
          </Space>
        </div>
      )}
    </div>
  );
};

export default TextClassifier;
