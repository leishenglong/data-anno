import React, { useState } from 'react';
import { 
  Steps, 
  Form, 
  Input, 
  Button, 
  Card, 
  Space, 
  Tag,
  message,
  Row,
  Col,
  ColorPicker,
} from 'antd';
import { 
  TagsOutlined, 
  HighlightOutlined, 
  ApartmentOutlined,
  MessageOutlined,
  StarOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  ProjectOutlined,
  SettingOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectApi } from '@/services/api';
import type { AnnotationType, LabelConfig, ScoreDimension } from '@/types';
import { ANNOTATION_TYPE_CONFIG } from '@/types';

const { Step } = Steps;
const { TextArea } = Input;

const PRESET_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', 
  '#722ed1', '#13c2c2', '#eb2f96', '#fa541c',
  '#fa8c16', '#a0d911', '#52c41a', '#13c2c2',
];

const ProjectCreate: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [annotationType, setAnnotationType] = useState<AnnotationType>('text_classification');
  const [labels, setLabels] = useState<LabelConfig[]>([]);
  const [entityLabels, setEntityLabels] = useState<LabelConfig[]>([]);
  const [relationTypes, setRelationTypes] = useState<string[]>([]);
  const [scoreDimensions, setScoreDimensions] = useState<ScoreDimension[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [newRelationType, setNewRelationType] = useState('');
  const [newDimension, setNewDimension] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const annotationTypes: AnnotationType[] = [
    'text_classification',
    'ner',
    'relation_extraction',
    'dialog',
    'score_review',
  ];

  const getAnnotationIcon = (type: AnnotationType) => {
    switch (type) {
      case 'text_classification':
        return <TagsOutlined />;
      case 'ner':
        return <HighlightOutlined />;
      case 'relation_extraction':
        return <ApartmentOutlined />;
      case 'dialog':
        return <MessageOutlined />;
      case 'score_review':
        return <StarOutlined />;
    }
  };

  const getAnnotationColor = (type: AnnotationType) => {
    switch (type) {
      case 'text_classification':
        return { primary: '#1890ff', bg: '#e6f4ff' };
      case 'ner':
        return { primary: '#52c41a', bg: '#f6ffed' };
      case 'relation_extraction':
        return { primary: '#722ed1', bg: '#f9f0ff' };
      case 'dialog':
        return { primary: '#fa8c16', bg: '#fff7e6' };
      case 'score_review':
        return { primary: '#faad14', bg: '#fffbe6' };
      default:
        return { primary: '#666', bg: '#f5f5f5' };
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!projectName || !projectName.trim()) {
        message.error('请输入项目名称');
        return;
      }
      try {
        await form.validateFields(['description']);
      } catch (e) {
        // description 是可选的
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      await handleSubmit();
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (annotationType === 'text_classification' || annotationType === 'ner') {
        if (!labels || labels.length === 0) {
          message.error('请添加至少一个标签');
          setLoading(false);
          return;
        }
      } else if (annotationType === 'relation_extraction') {
        if (!entityLabels || entityLabels.length === 0) {
          message.error('请添加至少一个实体标签');
          setLoading(false);
          return;
        }
        if (!relationTypes || relationTypes.length === 0) {
          message.error('请添加至少一个关系类型');
          setLoading(false);
          return;
        }
      } else if (annotationType === 'score_review' || annotationType === 'dialog') {
        if (!scoreDimensions || scoreDimensions.length === 0) {
          message.error('请添加至少一个评分维度');
          setLoading(false);
          return;
        }
      }

      if (!projectName || !projectName.trim()) {
        message.error('项目名称不能为空');
        setLoading(false);
        return;
      }

      const config: Record<string, any> = {};

      if (annotationType === 'text_classification' || annotationType === 'ner') {
        config.labels = labels || [];
      } else if (annotationType === 'relation_extraction') {
        config.entity_labels = entityLabels || [];
        config.relation_types = relationTypes || [];
      } else if (annotationType === 'score_review' || annotationType === 'dialog') {
        config.score_dimensions = scoreDimensions || [];
        if (annotationType === 'score_review') {
          config.max_score = 5;
        }
      }

      const description = projectDescription?.trim() || undefined;

      const projectData = {
        name: projectName.trim(),
        description: description,
        annotation_type: annotationType,
        config: config,
      };

      await projectApi.createProject(projectData);

      message.success('项目创建成功');
      navigate('/projects');
    } catch (error) {
      message.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const addLabel = () => {
    if (!newLabel.trim()) return;
    if (annotationType === 'relation_extraction') {
      setEntityLabels([...entityLabels, { name: newLabel.trim(), color: newLabelColor }]);
    } else {
      setLabels([...labels, { name: newLabel.trim(), color: newLabelColor }]);
    }
    setNewLabel('');
  };

  const removeLabel = (index: number) => {
    if (annotationType === 'relation_extraction') {
      setEntityLabels(entityLabels.filter((_, i) => i !== index));
    } else {
      setLabels(labels.filter((_, i) => i !== index));
    }
  };

  const addRelationType = () => {
    if (!newRelationType.trim()) return;
    setRelationTypes([...relationTypes, newRelationType.trim()]);
    setNewRelationType('');
  };

  const removeRelationType = (index: number) => {
    setRelationTypes(relationTypes.filter((_, i) => i !== index));
  };

  const addDimension = () => {
    if (!newDimension.trim()) return;
    setScoreDimensions([...scoreDimensions, { name: newDimension.trim() }]);
    setNewDimension('');
  };

  const removeDimension = (index: number) => {
    setScoreDimensions(scoreDimensions.filter((_, i) => i !== index));
  };

  const renderStep1 = () => (
    <Card 
      style={{ 
        maxWidth: 680,
        margin: '0 auto',
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      }}
      bodyStyle={{ padding: 32 }}
    >
      <div style={{ marginBottom: 24 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <ProjectOutlined style={{ fontSize: 28, color: '#fff' }} />
        </div>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#333' }}>
          项目基本信息
        </h3>
        <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: 14 }}>
          为您的标注项目起一个有意义的名字
        </p>
      </div>
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={<span style={{ fontWeight: 500 }}>项目名称</span>}
          rules={[{ required: true, message: '请输入项目名称' }]}
        >
          <Input
            placeholder="请输入项目名称，例如：新闻分类数据集"
            maxLength={50}
            showCount
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            size="large"
            style={{ borderRadius: 10 }}
          />
        </Form.Item>
        <Form.Item
          name="description"
          label={<span style={{ fontWeight: 500 }}>项目描述 <span style={{ color: '#999', fontWeight: 400 }}>（可选）</span></span>}
        >
          <TextArea
            placeholder="请输入项目描述，帮助团队成员理解项目用途..."
            rows={4}
            maxLength={500}
            showCount
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            style={{ borderRadius: 10 }}
          />
        </Form.Item>
      </Form>
    </Card>
  );

  const renderStep2 = () => (
    <Card 
      style={{ 
        maxWidth: 900,
        margin: '0 auto',
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      }}
      bodyStyle={{ padding: 32 }}
    >
      <div style={{ marginBottom: 24 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #722ed1 0%, #eb2f96 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <SettingOutlined style={{ fontSize: 28, color: '#fff' }} />
        </div>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#333' }}>
          选择标注类型
        </h3>
        <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: 14 }}>
          根据您的数据特点选择合适的标注任务类型
        </p>
      </div>
      <Row gutter={[20, 20]}>
        {annotationTypes.map((type) => {
          const isSelected = annotationType === type;
          const colorConfig = getAnnotationColor(type);
          return (
            <Col xs={24} sm={12} key={type}>
              <div
                onClick={() => setAnnotationType(type)}
                style={{
                  border: `2px solid ${isSelected ? colorConfig.primary : '#e8e8e8'}`,
                  borderRadius: 16,
                  cursor: 'pointer',
                  background: isSelected ? colorConfig.bg : '#fff',
                  padding: 20,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected ? `0 4px 16px ${colorConfig.primary}20` : '0 2px 8px rgba(0,0,0,0.04)',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}
                className="type-card"
              >
                <Space align="start" size={16}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: isSelected ? colorConfig.primary : colorConfig.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    color: isSelected ? '#fff' : colorConfig.primary,
                    transition: 'all 0.3s',
                    boxShadow: isSelected ? `0 4px 12px ${colorConfig.primary}40` : 'none',
                  }}>
                    {getAnnotationIcon(type)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: '#333', marginBottom: 4 }}>
                      {ANNOTATION_TYPE_CONFIG[type].label}
                    </div>
                    <div style={{ color: '#666', fontSize: 13, lineHeight: 1.5 }}>
                      {ANNOTATION_TYPE_CONFIG[type].description}
                    </div>
                  </div>
                </Space>
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: colorConfig.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <CheckOutlined style={{ color: '#fff', fontSize: 12 }} />
                  </div>
                )}
              </div>
            </Col>
          );
        })}
      </Row>
    </Card>
  );

  const renderStep3 = () => {
    if (annotationType === 'text_classification' || annotationType === 'ner') {
      return (
        <Card 
          style={{ 
            maxWidth: 680,
            margin: '0 auto',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
          bodyStyle={{ padding: 32 }}
        >
          <div style={{ marginBottom: 24 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #52c41a 0%, #13c2c2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <FlagOutlined style={{ fontSize: 28, color: '#fff' }} />
            </div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#333' }}>
              标签配置
            </h3>
            <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: 14 }}>
              添加分类或实体的标签，用于后续数据标注
            </p>
          </div>
          
          <div style={{
            padding: 20,
            background: '#fafafa',
            borderRadius: 12,
            marginBottom: 20,
          }}>
            <Space style={{ width: '100%', flexWrap: 'wrap' }} size={12}>
              <Input
                placeholder="输入标签名称"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onPressEnter={addLabel}
                style={{ width: 200, borderRadius: 8 }}
                size="large"
              />
              <ColorPicker
                value={newLabelColor}
                onChange={(color) => setNewLabelColor(color.toHexString())}
                presets={[{ label: '推荐颜色', colors: PRESET_COLORS }]}
                size="large"
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={addLabel}
                size="large"
                style={{ borderRadius: 8 }}
              >
                添加标签
              </Button>
            </Space>
          </div>
          
          <div style={{ minHeight: 120 }}>
            {labels.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {labels.map((label, index) => (
                  <Tag
                    key={index}
                    color={label.color}
                    closable
                    onClose={() => removeLabel(index)}
                    style={{ 
                      borderRadius: 20,
                      padding: '6px 14px',
                      fontSize: 14,
                      margin: 0,
                    }}
                  >
                    {label.name}
                  </Tag>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0',
                color: '#999',
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <FlagOutlined style={{ fontSize: 24 }} />
                </div>
                <p style={{ margin: 0 }}>暂无标签，请添加至少一个标签</p>
              </div>
            )}
          </div>
        </Card>
      );
    }

    if (annotationType === 'relation_extraction') {
      return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HighlightOutlined style={{ color: '#52c41a' }} />
                <span style={{ fontWeight: 600 }}>实体标签</span>
              </div>
            }
            style={{ 
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              marginBottom: 20,
            }}
            bodyStyle={{ padding: 24 }}
          >
            <div style={{
              padding: 16,
              background: '#fafafa',
              borderRadius: 12,
              marginBottom: 16,
            }}>
              <Space style={{ width: '100%', flexWrap: 'wrap' }} size={12}>
                <Input
                  placeholder="输入实体标签名称"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onPressEnter={addLabel}
                  style={{ width: 200, borderRadius: 8 }}
                  size="large"
                />
                <ColorPicker
                  value={newLabelColor}
                  onChange={(color) => setNewLabelColor(color.toHexString())}
                  presets={[{ label: '推荐颜色', colors: PRESET_COLORS }]}
                  size="large"
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={addLabel} size="large" style={{ borderRadius: 8 }}>
                  添加
                </Button>
              </Space>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {entityLabels.map((label, index) => (
                <Tag
                  key={index}
                  color={label.color}
                  closable
                  onClose={() => removeLabel(index)}
                  style={{ borderRadius: 20, padding: '6px 14px', fontSize: 14 }}
                >
                  {label.name}
                </Tag>
              ))}
              {entityLabels.length === 0 && (
                <div style={{ color: '#999', padding: '12px 0' }}>暂无实体标签</div>
              )}
            </div>
          </Card>

          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ApartmentOutlined style={{ color: '#722ed1' }} />
                <span style={{ fontWeight: 600 }}>关系类型</span>
              </div>
            }
            style={{ 
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            }}
            bodyStyle={{ padding: 24 }}
          >
            <div style={{
              padding: 16,
              background: '#fafafa',
              borderRadius: 12,
              marginBottom: 16,
            }}>
              <Space size={12}>
                <Input
                  placeholder="输入关系类型，例如：位于、工作于"
                  value={newRelationType}
                  onChange={(e) => setNewRelationType(e.target.value)}
                  onPressEnter={addRelationType}
                  style={{ width: 300, borderRadius: 8 }}
                  size="large"
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={addRelationType} size="large" style={{ borderRadius: 8 }}>
                  添加
                </Button>
              </Space>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {relationTypes.map((type, index) => (
                <Tag
                  key={index}
                  closable
                  onClose={() => removeRelationType(index)}
                  style={{ borderRadius: 20, padding: '6px 14px', fontSize: 14 }}
                >
                  {type}
                </Tag>
              ))}
              {relationTypes.length === 0 && (
                <div style={{ color: '#999', padding: '12px 0' }}>暂无关系类型</div>
              )}
            </div>
          </Card>
        </div>
      );
    }

    if (annotationType === 'score_review' || annotationType === 'dialog') {
      return (
        <Card 
          style={{ 
            maxWidth: 680,
            margin: '0 auto',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
          bodyStyle={{ padding: 32 }}
        >
          <div style={{ marginBottom: 24 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #faad14 0%, #fa541c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <StarOutlined style={{ fontSize: 28, color: '#fff' }} />
            </div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#333' }}>
              评分维度配置
            </h3>
            <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: 14 }}>
              定义评分任务的评估维度
            </p>
          </div>
          
          {annotationType === 'score_review' && (
            <div style={{
              padding: 16,
              background: '#e6f4ff',
              borderRadius: 12,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ color: '#1890ff', fontWeight: 500 }}>默认最高分：</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>5 分</span>
            </div>
          )}
          
          <div style={{
            padding: 20,
            background: '#fafafa',
            borderRadius: 12,
            marginBottom: 20,
          }}>
            <Space size={12}>
              <Input
                placeholder="输入评分维度，例如：流畅性、准确性"
                value={newDimension}
                onChange={(e) => setNewDimension(e.target.value)}
                onPressEnter={addDimension}
                style={{ width: 300, borderRadius: 8 }}
                size="large"
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={addDimension} size="large" style={{ borderRadius: 8 }}>
                添加维度
              </Button>
            </Space>
          </div>
          
          <div style={{ minHeight: 120 }}>
            {scoreDimensions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {scoreDimensions.map((dim, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => removeDimension(index)}
                    style={{ borderRadius: 20, padding: '6px 14px', fontSize: 14 }}
                  >
                    {dim.name}
                  </Tag>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0',
                color: '#999',
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <StarOutlined style={{ fontSize: 24 }} />
                </div>
                <p style={{ margin: 0 }}>暂无评分维度，请添加至少一个维度</p>
              </div>
            )}
          </div>
        </Card>
      );
    }

    return null;
  };

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ 
        marginBottom: 40,
        textAlign: 'center',
      }}>
        <h2 style={{ 
          margin: 0, 
          marginBottom: 8,
          fontSize: 26,
          fontWeight: 600,
          background: 'linear-gradient(120deg, #333 0%, #666 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          创建新项目
        </h2>
        <p style={{ margin: 0, color: '#999', fontSize: 14 }}>
          按照以下步骤创建您的智能数据标注项目
        </p>
      </div>

      {/* 步骤条 */}
      <div style={{ 
        maxWidth: 700,
        margin: '0 auto 40px',
      }}>
        <Steps 
          current={currentStep} 
          size="default"
          style={{ 
            padding: '24px 40px',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <Step 
            title={<span style={{ fontWeight: 600 }}>基本信息</span>} 
            description="项目名称和描述"
            icon={<ProjectOutlined />}
          />
          <Step 
            title={<span style={{ fontWeight: 600 }}>标注类型</span>} 
            description="选择标注任务"
            icon={<SettingOutlined />}
          />
          <Step 
            title={<span style={{ fontWeight: 600 }}>标签配置</span>} 
            description="配置标签集"
            icon={<FlagOutlined />}
          />
        </Steps>
      </div>

      {/* 步骤内容 */}
      <div style={{ minHeight: 350 }}>
        {currentStep === 0 && renderStep1()}
        {currentStep === 1 && renderStep2()}
        {currentStep === 2 && renderStep3()}
      </div>

      {/* 底部按钮 */}
      <div style={{ 
        marginTop: 40, 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 16,
        paddingBottom: 40,
      }}>
        {currentStep > 0 && (
          <Button 
            size="large" 
            icon={<ArrowLeftOutlined />} 
            onClick={handlePrev}
            style={{ 
              borderRadius: 10,
              height: 48,
              paddingLeft: 24,
              paddingRight: 24,
            }}
          >
            上一步
          </Button>
        )}
        {currentStep < 2 ? (
          <Button 
            type="primary" 
            size="large" 
            icon={<ArrowRightOutlined />}
            onClick={handleNext}
            style={{ 
              borderRadius: 10,
              height: 48,
              paddingLeft: 32,
              paddingRight: 32,
              background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
            }}
          >
            下一步
          </Button>
        ) : (
          <Button 
            type="primary" 
            size="large" 
            icon={<CheckOutlined />} 
            onClick={handleNext}
            loading={loading}
            style={{ 
              borderRadius: 10,
              height: 48,
              paddingLeft: 32,
              paddingRight: 32,
              background: 'linear-gradient(135deg, #52c41a 0%, #13c2c2 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
            }}
          >
            创建项目
          </Button>
        )}
      </div>

      {/* 全局样式 */}
      <style>{`
        .type-card {
          position: relative;
        }
        .type-card:hover {
          border-color: #1890ff !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(24, 144, 255, 0.15) !important;
        }
      `}</style>
    </div>
  );
};

export default ProjectCreate;
