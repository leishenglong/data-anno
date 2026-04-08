import React from 'react';
import { Card, Rate, Slider, Input, Space, Typography, Tag, Divider, Tooltip, Row, Col } from 'antd';
import { StarOutlined, MessageOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ProjectConfig, ScoreDimension } from '@/types';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface ScoreValue {
  scores: { [dimension: string]: number };
  comment: string;
}

interface ScoreReviewerProps {
  content: any;
  config: ProjectConfig;
  value?: ScoreValue;
  onChange: (value: ScoreValue) => void;
}

const ScoreReviewer: React.FC<ScoreReviewerProps> = ({
  content,
  config,
  value,
  onChange,
}) => {
  const dimensions = config.score_dimensions || [];
  const maxScore = config.max_score || 5;
  
  // 获取显示的文本内容
  const getTextContent = () => {
    if (typeof content === 'string') return content;
    if (content.text) return content.text;
    return JSON.stringify(content, null, 2);
  };

  // 初始化值
  const currentValue: ScoreValue = value || {
    scores: {},
    comment: '',
  };

  // 更新维度评分
  const updateDimensionScore = (dimensionName: string, score: number) => {
    onChange({
      ...currentValue,
      scores: {
        ...currentValue.scores,
        [dimensionName]: score,
      },
    });
  };

  // 更新评论
  const updateComment = (comment: string) => {
    onChange({ ...currentValue, comment });
  };

  // 计算平均分
  const calculateAverage = () => {
    const scores = Object.values(currentValue.scores);
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  // 获取评分描述
  const getScoreDescription = (score: number, max: number) => {
    const ratio = score / max;
    if (ratio >= 0.9) return '优秀';
    if (ratio >= 0.8) return '良好';
    if (ratio >= 0.6) return '一般';
    if (ratio >= 0.4) return '较差';
    return '很差';
  };

  // 获取评分颜色
  const getScoreColor = (score: number, max: number) => {
    const ratio = score / max;
    if (ratio >= 0.9) return '#52c41a';
    if (ratio >= 0.8) return '#73d13d';
    if (ratio >= 0.6) return '#faad14';
    if (ratio >= 0.4) return '#fa8c16';
    return '#f5222d';
  };

  // 渲染评分维度
  const renderDimension = (dimension: ScoreDimension, index: number) => {
    const currentScore = currentValue.scores[dimension.name] || 0;
    const useSlider = maxScore > 5;

    return (
      <Card
        key={dimension.name}
        size="small"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: 16 }}
      >
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space direction="vertical" size={0}>
              <Text strong>
                {index + 1}. {dimension.name}
              </Text>
              {dimension.description && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dimension.description}
                </Text>
              )}
            </Space>
          </Col>
          <Col span={12}>
            {useSlider ? (
              <Slider
                min={0}
                max={maxScore}
                step={1}
                value={currentScore}
                onChange={(value) => updateDimensionScore(dimension.name, value)}
                marks={{
                  0: '0',
                  [Math.floor(maxScore / 2)]: String(Math.floor(maxScore / 2)),
                  [maxScore]: String(maxScore),
                }}
              />
            ) : (
              <Rate
                count={maxScore}
                value={currentScore}
                onChange={(value) => updateDimensionScore(dimension.name, value)}
                style={{ fontSize: 24 }}
              />
            )}
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            {currentScore > 0 && (
              <Space>
                <Tag
                  color={getScoreColor(currentScore, maxScore)}
                  style={{ fontSize: 14, padding: '4px 12px' }}
                >
                  {currentScore} / {maxScore}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {getScoreDescription(currentScore, maxScore)}
                </Text>
              </Space>
            )}
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      {/* 文本内容展示 */}
      <Card
        title="待评审内容"
        style={{ marginBottom: 24 }}
      >
        <div
          style={{
            padding: 20,
            background: '#f6ffed',
            borderRadius: 8,
            border: '1px solid #b7eb8f',
            fontSize: 16,
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}
        >
          {getTextContent()}
        </div>
      </Card>

      {/* 评分维度 */}
      <Card
        title={
          <Space>
            <StarOutlined />
            <span>多维度评分</span>
            <Tooltip title="请根据各个维度对内容进行评分">
              <InfoCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {dimensions.length === 0 ? (
          <Text type="secondary">
            暂无评分维度，请在项目配置中添加
          </Text>
        ) : (
          <>
            {dimensions.map((dim, idx) => renderDimension(dim, idx))}
            
            {/* 平均分展示 */}
            <Divider />
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                综合评分
              </Text>
              <Space align="center">
                <Title level={2} style={{ margin: 0, color: getScoreColor(calculateAverage(), maxScore) }}>
                  {calculateAverage().toFixed(1)}
                </Title>
                <Text type="secondary">/ {maxScore}</Text>
              </Space>
              {Object.keys(currentValue.scores).length === dimensions.length && (
                <Tag
                  color={getScoreColor(calculateAverage(), maxScore)}
                  style={{ marginLeft: 16, fontSize: 14 }}
                >
                  {getScoreDescription(calculateAverage(), maxScore)}
                </Tag>
              )}
            </div>
          </>
        )}
      </Card>

      {/* 评论区域 */}
      <Card
        title={
          <Space>
            <MessageOutlined />
            <span>评审意见</span>
          </Space>
        }
      >
        <TextArea
          placeholder="请输入您的评审意见（可选）..."
          value={currentValue.comment}
          onChange={(e) => updateComment(e.target.value)}
          rows={4}
          showCount
          maxLength={500}
        />
      </Card>
    </div>
  );
};

export default ScoreReviewer;
