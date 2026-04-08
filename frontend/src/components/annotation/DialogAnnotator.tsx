import React from 'react';
import { Card, Rate, Input, Space, Typography, Tag, Row, Col, Radio } from 'antd';
import { UserOutlined, RobotOutlined, MessageOutlined, StarOutlined } from '@ant-design/icons';
import type { ProjectConfig } from '@/types';

const { Text } = Typography;
const { TextArea } = Input;

interface TurnAnnotation {
  turn_id: number;
  score: number;
  comment: string;
}

interface DialogValue {
  turns: TurnAnnotation[];
  overall_score: number;
  preference?: string; // 偏好选择的回复ID
}

interface DialogAnnotatorProps {
  content: any;
  config: ProjectConfig;
  value?: DialogValue;
  onChange: (value: DialogValue) => void;
}

const DialogAnnotator: React.FC<DialogAnnotatorProps> = ({
  content,
  config: _config,
  value,
  onChange,
}) => {
  // 获取对话轮次
  const getTurns = () => {
    if (!content || typeof content !== 'object') return [];
    if (content.turns && Array.isArray(content.turns)) {
      return content.turns;
    }
    if (content.conversation && Array.isArray(content.conversation)) {
      return content.conversation.map((t: any, idx: number) => ({
        turn_id: idx + 1,
        role: t?.role || 'user',
        content: t?.content || t?.message || '',
      }));
    }
    return [];
  };

  // 获取回复选项（用于偏好标注）
  const getResponseOptions = () => {
    if (!content || typeof content !== 'object') return [];
    return content.response_options || content.candidates || [];
  };

  const turns = getTurns();
  const responseOptions = getResponseOptions();
  const hasPreferenceTask = responseOptions.length > 1;

  // 初始化值
  const currentValue: DialogValue = value || {
    turns: turns.map((t: any) => ({ turn_id: t.turn_id || t.id || 1, score: 0, comment: '' })),
    overall_score: 0,
  };

  // 更新单轮评分
  const updateTurnScore = (turnId: number, score: number) => {
    const updatedTurns = currentValue.turns.map((t) =>
      t.turn_id === turnId ? { ...t, score } : t
    );
    // 如果没有找到，添加新的
    if (!updatedTurns.find((t) => t.turn_id === turnId)) {
      updatedTurns.push({ turn_id: turnId, score, comment: '' });
    }
    onChange({ ...currentValue, turns: updatedTurns });
  };

  // 更新单轮评论
  const updateTurnComment = (turnId: number, comment: string) => {
    const updatedTurns = currentValue.turns.map((t) =>
      t.turn_id === turnId ? { ...t, comment } : t
    );
    if (!updatedTurns.find((t) => t.turn_id === turnId)) {
      updatedTurns.push({ turn_id: turnId, score: 0, comment });
    }
    onChange({ ...currentValue, turns: updatedTurns });
  };

  // 更新整体评分
  const updateOverallScore = (overall_score: number) => {
    onChange({ ...currentValue, overall_score });
  };

  // 更新偏好选择
  const updatePreference = (preference: string) => {
    onChange({ ...currentValue, preference });
  };

  // 获取单轮的评分和评论
  const getTurnAnnotation = (turnId: number): TurnAnnotation => {
    return currentValue.turns.find((t) => t.turn_id === turnId) || { turn_id: turnId, score: 0, comment: '' };
  };

  // 渲染聊天气泡
  const renderChatBubble = (turn: any, index: number) => {
    const isUser = turn.role === 'user' || turn.role === 'human';
    const annotation = getTurnAnnotation(turn.turn_id || turn.id || index + 1);
    const turnId = turn.turn_id || turn.id || index + 1;

    return (
      <div
        key={turnId}
        style={{
          display: 'flex',
          flexDirection: isUser ? 'row' : 'row-reverse',
          marginBottom: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* 头像 */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: isUser ? '#1890ff' : '#52c41a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {isUser ? <UserOutlined /> : <RobotOutlined />}
        </div>

        {/* 消息内容 */}
        <div
          style={{
            maxWidth: '70%',
            marginLeft: isUser ? 12 : 0,
            marginRight: isUser ? 0 : 12,
          }}
        >
          {/* 角色标签 */}
          <Tag color={isUser ? 'blue' : 'green'} style={{ marginBottom: 4 }}>
            {turn?.role || (isUser ? 'User' : 'Assistant')}
          </Tag>

          {/* 消息气泡 */}
          <div
            style={{
              padding: 12,
              background: isUser ? '#e6f7ff' : '#f6ffed',
              borderRadius: 12,
              border: `1px solid ${isUser ? '#91d5ff' : '#b7eb8f'}`,
            }}
          >
            <Text style={{ whiteSpace: 'pre-wrap' }}>{turn?.content || turn?.message || ''}</Text>
          </div>

          {/* 评分区域（仅对AI回复） */}
          {!isUser && (
            <Card
              size="small"
              style={{ marginTop: 8, background: '#fafafa' }}
              styles={{ body: { padding: 12 } }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    质量评分：
                  </Text>
                  <Rate
                    value={annotation.score}
                    onChange={(value) => updateTurnScore(turnId, value)}
                    style={{ fontSize: 16 }}
                  />
                  {annotation.score > 0 && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {annotation.score} 星
                    </Tag>
                  )}
                </div>
                <TextArea
                  placeholder="添加评论（可选）..."
                  value={annotation.comment}
                  onChange={(e) => updateTurnComment(turnId, e.target.value)}
                  rows={2}
                  style={{ fontSize: 12 }}
                />
              </Space>
            </Card>
          )}
        </div>
      </div>
    );
  };

  // 渲染偏好选择（对比模式）
  const renderPreferenceSelection = () => {
    if (!hasPreferenceTask) return null;

    return (
      <Card
        title={
          <Space>
            <MessageOutlined />
            <span>偏好标注 - 选择最佳回复</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Radio.Group
          value={currentValue.preference}
          onChange={(e) => updatePreference(e.target.value)}
          style={{ width: '100%' }}
        >
          <Row gutter={16}>
            {responseOptions.map((option: any, index: number) => (
              <Col span={12} key={option?.id || index}>
                <Card
                  size="small"
                  style={{
                    borderColor: currentValue.preference === (option?.id || String(index)) ? '#1890ff' : undefined,
                    background: currentValue.preference === (option?.id || String(index)) ? '#e6f7ff' : undefined,
                  }}
                >
                  <Radio value={option?.id || String(index)}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Tag color="purple">选项 {String.fromCharCode(65 + index)}</Tag>
                      <Text style={{ whiteSpace: 'pre-wrap' }}>
                        {option?.content || option?.text || option?.message || ''}
                      </Text>
                    </Space>
                  </Radio>
                </Card>
              </Col>
            ))}
          </Row>
        </Radio.Group>
      </Card>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      {/* 对话展示 */}
      <Card
        title={
          <Space>
            <MessageOutlined />
            <span>对话内容</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {turns.length === 0 ? (
          <Text type="secondary">暂无对话内容</Text>
        ) : (
          <div style={{ padding: 8 }}>{turns.map((turn: any, idx: number) => renderChatBubble(turn, idx))}</div>
        )}
      </Card>

      {/* 偏好选择 */}
      {renderPreferenceSelection()}

      {/* 整体评分 */}
      <Card
        title={
          <Space>
            <StarOutlined />
            <span>整体评价</span>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              整体评分：
            </Text>
            <Rate
              value={currentValue.overall_score}
              onChange={updateOverallScore}
              style={{ fontSize: 24 }}
            />
            {currentValue.overall_score > 0 && (
              <Tag color="gold" style={{ marginLeft: 16, fontSize: 14 }}>
                {currentValue.overall_score} 星
              </Tag>
            )}
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default DialogAnnotator;
