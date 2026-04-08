import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, Spin, Empty, Typography, Space, Button } from 'antd';
import {
  ProjectOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  TagsOutlined,
  HighlightOutlined,
  ApartmentOutlined,
  MessageOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { statsApi, type SystemOverview } from '@/services/api';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const data = await statsApi.getOverview();
      setOverview(data);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text_classification': return <TagsOutlined />;
      case 'ner': return <HighlightOutlined />;
      case 'relation_extraction': return <ApartmentOutlined />;
      case 'dialog': return <MessageOutlined />;
      case 'score_review': return <StarOutlined />;
      default: return <TagsOutlined />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text_classification': return '#1890ff';
      case 'ner': return '#52c41a';
      case 'relation_extraction': return '#722ed1';
      case 'dialog': return '#fa8c16';
      case 'score_review': return '#faad14';
      default: return '#666';
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      text_classification: '文本分类',
      ner: 'NER',
      relation_extraction: '关系抽取',
      dialog: '对话标注',
      score_review: '评分评审',
    };
    return map[type] || type;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Empty description="暂无统计数据" />
      </div>
    );
  }

  const { projects, datasets, items, annotations, progress, recent_projects } = overview;

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ margin: 0 }}>
          数据标注平台
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          系统概览与快速入口
        </Text>
      </div>

      {/* 核心统计卡片 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
        <Col xs={12} sm={6}>
          <Card
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title={<span style={{ color: '#666' }}>项目数量</span>}
              value={projects.total}
              prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
              suffix={<span style={{ fontSize: 14, color: '#999' }}>个</span>}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title={<span style={{ color: '#666' }}>数据集</span>}
              value={datasets.total}
              prefix={<DatabaseOutlined style={{ color: '#722ed1' }} />}
              suffix={<span style={{ fontSize: 14, color: '#999' }}>个</span>}
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title={<span style={{ color: '#666' }}>总数据量</span>}
              value={items.total}
              prefix={<FileTextOutlined style={{ color: '#13c2c2' }} />}
              suffix={<span style={{ fontSize: 14, color: '#999' }}>条</span>}
              valueStyle={{ color: '#13c2c2', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title={<span style={{ color: '#666' }}>标注记录</span>}
              value={annotations.total}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              suffix={<span style={{ fontSize: 14, color: '#999' }}>条</span>}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 进度与AI统计 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
        <Col xs={24} md={12}>
          <Card
            title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} />标注进度</Space>}
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 24 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Progress
                type="circle"
                percent={progress.annotation}
                size={140}
                strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
                format={(p) => <span style={{ fontSize: 24, fontWeight: 700 }}>{p}%</span>}
              />
            </div>
            <Row gutter={16}>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#fa8c16' }}>{items.pending}</div>
                <div style={{ fontSize: 12, color: '#999' }}>待标注</div>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}>{items.annotated}</div>
                <div style={{ fontSize: 12, color: '#999' }}>已标注</div>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>{items.reviewed}</div>
                <div style={{ fontSize: 12, color: '#999' }}>已审核</div>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={<Space><RobotOutlined style={{ color: '#722ed1' }} />AI 辅助统计</Space>}
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 24 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Progress
                type="circle"
                percent={progress.ai_percentage}
                size={140}
                strokeColor={{ '0%': '#722ed1', '100%': '#eb2f96' }}
                format={(p) => <span style={{ fontSize: 24, fontWeight: 700 }}>{p}%</span>}
              />
              <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>AI 生成占比</div>
            </div>
            <Row gutter={16}>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#722ed1' }}>{annotations.ai_generated}</div>
                <div style={{ fontSize: 12, color: '#999' }}>AI 标注</div>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>{annotations.approved}</div>
                <div style={{ fontSize: 12, color: '#999' }}>已通过</div>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#faad14' }}>{annotations.pending_review}</div>
                <div style={{ fontSize: 12, color: '#999' }}>待审核</div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 项目类型分布 + 最近项目 */}
      <Row gutter={[20, 20]}>
        <Col xs={24} md={10}>
          <Card
            title={<Space><ProjectOutlined style={{ color: '#1890ff' }} />项目类型分布</Space>}
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 24 }}
          >
            {Object.keys(projects.by_type).length === 0 ? (
              <Empty description="暂无项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(projects.by_type).map(([type, count]) => {
                  const percent = projects.total > 0 ? Math.round((count / projects.total) * 100) : 0;
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Space>
                          <Tag color={getTypeColor(type)} style={{ borderRadius: 12 }}>
                            {getTypeIcon(type)} {getTypeLabel(type)}
                          </Tag>
                        </Space>
                        <Text type="secondary">{count} 个 ({percent}%)</Text>
                      </div>
                      <Progress
                        percent={percent}
                        showInfo={false}
                        strokeColor={getTypeColor(type)}
                        size="small"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card
            title={<Space><ClockCircleOutlined style={{ color: '#fa8c16' }} />最近项目</Space>}
            extra={
              <Button type="link" onClick={() => navigate('/projects')}>
                查看全部 <ArrowRightOutlined />
              </Button>
            }
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 0 }}
          >
            {recent_projects.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="暂无项目，点击新建项目开始" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                  <Button type="primary" onClick={() => navigate('/projects/create')}>
                    新建项目
                  </Button>
                </Empty>
              </div>
            ) : (
              <div>
                {recent_projects.map((project, idx) => (
                  <div
                    key={project.id}
                    style={{
                      padding: '16px 24px',
                      borderBottom: idx < recent_projects.length - 1 ? '1px solid #f0f0f0' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: `${getTypeColor(project.annotation_type)}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: getTypeColor(project.annotation_type),
                        }}>
                          {getTypeIcon(project.annotation_type)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#333' }}>{project.name}</div>
                          <Space size={8}>
                            <Tag color={getTypeColor(project.annotation_type)} style={{ fontSize: 11, borderRadius: 10 }}>
                              {getTypeLabel(project.annotation_type)}
                            </Tag>
                            {project.created_at && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(project.created_at).toLocaleDateString()}
                              </Text>
                            )}
                          </Space>
                        </div>
                      </Space>
                      <ArrowRightOutlined style={{ color: '#ccc' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 快速入口 */}
      <Row gutter={[20, 20]} style={{ marginTop: 28 }}>
        <Col span={24}>
          <Card
            title={<Space><AuditOutlined style={{ color: '#1890ff' }} />快速入口</Space>}
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 24 }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Button
                  block
                  size="large"
                  icon={<ProjectOutlined />}
                  onClick={() => navigate('/projects')}
                  style={{ height: 60, borderRadius: 12, fontSize: 15 }}
                >
                  项目管理
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button
                  block
                  size="large"
                  icon={<RobotOutlined />}
                  onClick={() => navigate('/ai-config')}
                  style={{ height: 60, borderRadius: 12, fontSize: 15 }}
                >
                  AI 配置
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button
                  block
                  size="large"
                  type="primary"
                  icon={<ProjectOutlined />}
                  onClick={() => navigate('/projects/create')}
                  style={{ height: 60, borderRadius: 12, fontSize: 15 }}
                >
                  新建项目
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button
                  block
                  size="large"
                  icon={<AuditOutlined />}
                  onClick={() => navigate('/projects')}
                  style={{ height: 60, borderRadius: 12, fontSize: 15 }}
                >
                  标注审核
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
