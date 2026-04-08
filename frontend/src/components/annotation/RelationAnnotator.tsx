import React, { useState, useRef, useCallback } from 'react';
import { Tag, Space, Typography, Popover, Button, List, Tooltip, Empty, Steps, Card, Divider } from 'antd';
import { DeleteOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { ProjectConfig } from '@/types';

const { Text } = Typography;
const { Step } = Steps;

interface Entity {
  id: string;
  text: string;
  start: number;
  end: number;
  label: string;
}

interface Relation {
  id: string;
  source: string; // entity id
  target: string; // entity id
  type: string;
}

interface RelationValue {
  entities: Entity[];
  relations: Relation[];
}

interface RelationAnnotatorProps {
  content: any;
  config: ProjectConfig;
  value?: RelationValue;
  onChange: (value: RelationValue) => void;
}

const RelationAnnotator: React.FC<RelationAnnotatorProps> = ({
  content,
  config,
  value,
  onChange,
}) => {
  const entityLabels = config.entity_labels || config.labels || [];
  const relationTypes = config.relation_types || [];
  
  const entities = value?.entities || [];
  const relations = value?.relations || [];
  
  const textRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0); // 0: 标注实体, 1: 标注关系
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);

  // 获取显示的文本内容
  const getTextContent = () => {
    if (typeof content === 'string') return content;
    if (content.text) return content.text;
    return '';
  };

  const text = getTextContent();

  // 生成唯一ID
  const generateId = () => `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 处理文本选择
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;

    const selectedText = selection.toString().trim();
    if (!selectedText) return null;

    const range = selection.getRangeAt(0);
    const textNode = textRef.current;
    
    if (!textNode) return null;

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

    // 检查重叠
    const hasOverlap = entities.some(
      (e) => (newEntity.start < e.end && newEntity.end > e.start)
    );

    if (hasOverlap) {
      const filteredEntities = entities.filter(
        (e) => !(newEntity.start < e.end && newEntity.end > e.start)
      );
      onChange({ entities: [...filteredEntities, newEntity], relations });
    } else {
      onChange({ entities: [...entities, newEntity], relations });
    }

    window.getSelection()?.removeAllRanges();
  };

  // 删除实体
  const deleteEntity = (id: string) => {
    const filteredEntities = entities.filter((e) => e.id !== id);
    const filteredRelations = relations.filter(
      (r) => r.source !== id && r.target !== id
    );
    onChange({ entities: filteredEntities, relations: filteredRelations });
  };

  // 选择实体用于建立关系
  const selectEntityForRelation = (entityId: string) => {
    if (selectedEntityIds.includes(entityId)) {
      setSelectedEntityIds(selectedEntityIds.filter((id) => id !== entityId));
    } else if (selectedEntityIds.length < 2) {
      const newSelected = [...selectedEntityIds, entityId];
      setSelectedEntityIds(newSelected);
      
      // 如果选择了两个实体，自动弹出关系选择
      if (newSelected.length === 2) {
        // 等待用户选择关系类型
      }
    } else {
      // 已选两个，重置并选择新的
      setSelectedEntityIds([entityId]);
    }
  };

  // 添加关系
  const addRelation = (type: string) => {
    if (selectedEntityIds.length !== 2) return;
    
    const [source, target] = selectedEntityIds;
    
    // 检查是否已存在相同关系
    const exists = relations.some(
      (r) => r.source === source && r.target === target && r.type === type
    );
    
    if (!exists) {
      const newRelation: Relation = {
        id: generateId(),
        source,
        target,
        type,
      };
      onChange({ entities, relations: [...relations, newRelation] });
    }
    
    setSelectedEntityIds([]);
  };

  // 删除关系
  const deleteRelation = (id: string) => {
    onChange({ entities, relations: relations.filter((r) => r.id !== id) });
  };

  // 获取标签颜色
  const getLabelColor = (labelName: string) => {
    const label = entityLabels.find((l) => l.name === labelName);
    return label?.color || 'default';
  };

  // 获取实体
  const getEntityById = (id: string) => entities.find((e) => e.id === id);

  // 渲染带高亮实体的文本
  const renderHighlightedText = () => {
    if (!text) return null;
    if (entities.length === 0) return text;

    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedEntities.forEach((entity, index) => {
      if (entity.start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>{text.slice(lastIndex, entity.start)}</span>
        );
      }

      const isSelected = selectedEntityIds.includes(entity.id);
      
      elements.push(
        <Tooltip key={entity.id} title={`${entity.label}: ${entity.text}`}>
          <Tag
            color={getLabelColor(entity.label)}
            style={{
              margin: 0,
              padding: '2px 6px',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              cursor: currentStep === 1 ? 'pointer' : 'default',
              border: isSelected ? '2px solid #1890ff' : undefined,
              boxShadow: isSelected ? '0 0 4px #1890ff' : undefined,
            }}
            onClick={() => currentStep === 1 && selectEntityForRelation(entity.id)}
          >
            {entity.text}
          </Tag>
        </Tooltip>
      );

      lastIndex = entity.end;
    });

    if (lastIndex < text.length) {
      elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
    }

    return elements;
  };

  // 实体标签选择器
  const EntityLabelSelector: React.FC<{ selection: { text: string; start: number; end: number } | null }> = ({ selection }) => {
    if (!selection) return <Text type="secondary">请先选中文本</Text>;

    return (
      <div style={{ maxWidth: 200 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          选中文本: "{selection.text}"
        </Text>
        <Space wrap size="small">
          {entityLabels.map((label) => (
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
        {entityLabels.length === 0 && <Text type="secondary">暂无可用标签</Text>}
      </div>
    );
  };

  // 关系选择器
  const RelationSelector = () => {
    if (selectedEntityIds.length !== 2) {
      return <Text type="secondary">请先选择两个实体</Text>;
    }

    const source = getEntityById(selectedEntityIds[0]);
    const target = getEntityById(selectedEntityIds[1]);

    return (
      <div style={{ maxWidth: 300 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          建立关系:
        </Text>
        <Space align="center" style={{ marginBottom: 12 }}>
          <Tag color={source ? getLabelColor(source.label) : 'default'}>
            {source?.text}
          </Tag>
          <ArrowRightOutlined />
          <Tag color={target ? getLabelColor(target.label) : 'default'}>
            {target?.text}
          </Tag>
        </Space>
        <Divider style={{ margin: '8px 0' }} />
        <Text style={{ display: 'block', marginBottom: 8 }}>选择关系类型：</Text>
        <Space wrap size="small">
          {relationTypes.map((type) => (
            <Button key={type} size="small" type="primary" onClick={() => addRelation(type)}>
              {type}
            </Button>
          ))}
        </Space>
        {relationTypes.length === 0 && <Text type="secondary">请在项目配置中添加关系类型</Text>}
      </div>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      {/* 步骤指示器 */}
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 24 }}
        onChange={setCurrentStep}
      >
        <Step title="标注实体" />
        <Step title="标注关系" />
      </Steps>

      {/* 文本内容展示区域 */}
      <Card
        title={currentStep === 0 ? '选中文本标注实体' : '点击实体选择两个建立关系'}
        size="small"
        style={{ marginBottom: 16 }}
      >
        {currentStep === 0 ? (
          <Popover
            content={<EntityLabelSelector selection={handleTextSelection()} />}
            trigger="click"
            placement="bottom"
          >
            <div
              ref={textRef}
              style={{
                padding: 16,
                background: '#f6ffed',
                borderRadius: 4,
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
        ) : (
          <Popover
            content={<RelationSelector />}
            open={selectedEntityIds.length === 2}
            placement="bottom"
          >
            <div
              style={{
                padding: 16,
                background: '#f6ffed',
                borderRadius: 4,
                fontSize: 16,
                lineHeight: 2,
                whiteSpace: 'pre-wrap',
              }}
            >
              {renderHighlightedText()}
            </div>
          </Popover>
        )}
      </Card>

      {/* 实体列表 */}
      <Card title={`已标注实体 (${entities.length})`} size="small" style={{ marginBottom: 16 }}>
        {entities.length === 0 ? (
          <Empty description="暂无实体" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
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
      </Card>

      {/* 关系列表 */}
      <Card title={`已标注关系 (${relations.length})`} size="small">
        {relations.length === 0 ? (
          <Empty description="暂无关系" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={relations}
            renderItem={(relation) => {
              const source = getEntityById(relation.source);
              const target = getEntityById(relation.target);
              return (
                <List.Item
                  actions={[
                    <Button
                      key="delete"
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => deleteRelation(relation.id)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <Space>
                    <Tag color={source ? getLabelColor(source.label) : 'default'}>
                      {source?.text || '?'}
                    </Tag>
                    <ArrowRightOutlined style={{ color: '#1890ff' }} />
                    <Tag color="blue">{relation.type}</Tag>
                    <ArrowRightOutlined style={{ color: '#1890ff' }} />
                    <Tag color={target ? getLabelColor(target.label) : 'default'}>
                      {target?.text || '?'}
                    </Tag>
                  </Space>
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default RelationAnnotator;
