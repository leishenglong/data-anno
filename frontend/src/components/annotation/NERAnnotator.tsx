import React, { useRef, useCallback } from 'react';
import { Tag, Space, Typography, Popover, Button, List, Tooltip, Empty } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ProjectConfig } from '@/types';

const { Text } = Typography;

interface Entity {
  id: string;
  text: string;
  start: number;
  end: number;
  label: string;
}

interface NERValue {
  entities: Entity[];
}

interface NERAnnotatorProps {
  content: any;
  config: ProjectConfig;
  value?: NERValue;
  onChange: (value: NERValue) => void;
}

const NERAnnotator: React.FC<NERAnnotatorProps> = ({
  content,
  config,
  value,
  onChange,
}) => {
  const labels = config.labels || config.entity_labels || [];
  const entities = value?.entities || [];
  const textRef = useRef<HTMLDivElement>(null);
  
  // 获取显示的文本内容
  const getTextContent = () => {
    if (typeof content === 'string') return content;
    if (content.text) return content.text;
    return '';
  };

  const text = getTextContent();

  // 生成唯一ID
  const generateId = () => `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 处理文本选择
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;

    const selectedText = selection.toString().trim();
    if (!selectedText) return null;

    const range = selection.getRangeAt(0);
    const textNode = textRef.current;
    
    if (!textNode) return null;

    // 计算在原始文本中的位置
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(textNode);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;
    const end = start + selectedText.length;

    return { text: selectedText, start, end };
  }, []);

  // 添加实体
  const addEntity = (label: string, selection: { text: string; start: number; end: number }) => {
    const newEntity: Entity = {
      id: generateId(),
      text: selection.text,
      start: selection.start,
      end: selection.end,
      label,
    };

    // 检查是否有重叠的实体
    const hasOverlap = entities.some(
      (e) =>
        (newEntity.start < e.end && newEntity.end > e.start)
    );

    if (hasOverlap) {
      // 移除重叠的实体
      const filteredEntities = entities.filter(
        (e) => !(newEntity.start < e.end && newEntity.end > e.start)
      );
      onChange({ entities: [...filteredEntities, newEntity] });
    } else {
      onChange({ entities: [...entities, newEntity] });
    }

    // 清除选择
    window.getSelection()?.removeAllRanges();
  };

  // 删除实体
  const deleteEntity = (id: string) => {
    onChange({ entities: entities.filter((e) => e.id !== id) });
  };

  // 获取标签颜色
  const getLabelColor = (labelName: string) => {
    const label = labels.find((l) => l.name === labelName);
    return label?.color || 'default';
  };

  // 渲染带高亮实体的文本
  const renderHighlightedText = () => {
    if (!text) return null;
    if (entities.length === 0) return text;

    // 按起始位置排序实体
    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);
    
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedEntities.forEach((entity, index) => {
      // 添加实体前的文本
      if (entity.start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>{text.slice(lastIndex, entity.start)}</span>
        );
      }

      // 添加高亮的实体
      elements.push(
        <Tooltip
          key={entity.id}
          title={`${entity.label}: ${entity.text}`}
        >
          <Tag
            color={getLabelColor(entity.label)}
            style={{
              margin: 0,
              padding: '2px 6px',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              cursor: 'pointer',
            }}
          >
            {entity.text}
          </Tag>
        </Tooltip>
      );

      lastIndex = entity.end;
    });

    // 添加剩余文本
    if (lastIndex < text.length) {
      elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
    }

    return elements;
  };

  // 标签选择器内容
  const LabelSelector: React.FC<{ selection: { text: string; start: number; end: number } | null }> = ({ selection }) => {
    if (!selection) return <Text type="secondary">请先选中文本</Text>;

    return (
      <div style={{ maxWidth: 200 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          选中文本: "{selection.text}"
        </Text>
        <Space wrap size="small">
          {labels.map((label) => (
            <Button
              key={label.name}
              size="small"
              type="primary"
              style={{ backgroundColor: label.color, borderColor: label.color }}
              onClick={() => addEntity(label.name, selection)}
            >
              {label.name}
            </Button>
          ))}
        </Space>
        {labels.length === 0 && (
          <Text type="secondary">暂无可用标签</Text>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      {/* 文本内容展示区域 */}
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 12 }}>
          文本内容（选中文本进行标注）：
        </Text>
        <Popover
          content={<LabelSelector selection={handleTextSelection()} />}
          trigger="click"
          placement="bottom"
        >
          <div
            ref={textRef}
            style={{
              padding: 20,
              background: '#f6ffed',
              borderRadius: 8,
              border: '1px solid #b7eb8f',
              fontSize: 16,
              lineHeight: 2,
              whiteSpace: 'pre-wrap',
              cursor: 'text',
              userSelect: 'text',
            }}
          >
            {renderHighlightedText()}
          </div>
        </Popover>
      </div>

      {/* 已标注实体列表 */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 12 }}>
          已标注实体 ({entities.length}):
        </Text>
        
        {entities.length === 0 ? (
          <Empty description="暂无标注实体，请在上方文本中选中文本并标注" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            bordered
            dataSource={entities}
            renderItem={(entity) => (
              <List.Item
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => deleteEntity(entity.id)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <Space>
                  <Tag color={getLabelColor(entity.label)}>{entity.label}</Tag>
                  <Text>{entity.text}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    [{entity.start}-{entity.end}]
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>

      {/* 标签说明 */}
      {labels.length > 0 && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            可用标签：
          </Text>
          <Space wrap>
            {labels.map((label) => (
              <Tag key={label.name} color={label.color}>
                {label.name}
              </Tag>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
};

export default NERAnnotator;
