import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Spin, 
  message, 
  Popconfirm,
  Tooltip,
  Progress,
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  DatabaseOutlined,
  ClockCircleOutlined,
  TagsOutlined,
  HighlightOutlined,
  ApartmentOutlined,
  MessageOutlined,
  StarOutlined,
  EditOutlined,
  RightOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectApi } from '@/services/api';
import type { Project, AnnotationType } from '@/types';
import { ANNOTATION_TYPE_CONFIG } from '@/types';

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProjects();
      setProjects(response || []);
    } catch (error) {
      message.error('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await projectApi.deleteProject(id);
      message.success('项目删除成功');
      fetchProjects();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getAnnotationTypeIcon = (type: AnnotationType) => {
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
      default:
        return <TagsOutlined />;
    }
  };

  const getAnnotationTypeColor = (type: AnnotationType) => {
    switch (type) {
      case 'text_classification':
        return { bg: '#e6f4ff', color: '#1890ff', border: '#91caff' };
      case 'ner':
        return { bg: '#f6ffed', color: '#52c41a', border: '#b7eb8f' };
      case 'relation_extraction':
        return { bg: '#f9f0ff', color: '#722ed1', border: '#d3adf7' };
      case 'dialog':
        return { bg: '#fff7e6', color: '#fa8c16', border: '#ffd591' };
      case 'score_review':
        return { bg: '#fffbe6', color: '#faad14', border: '#ffe58f' };
      default:
        return { bg: '#f5f5f5', color: '#666', border: '#d9d9d9' };
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: 400,
        flexDirection: 'column',
        gap: 16,
      }}>
        <Spin size="large" />
        <span style={{ color: '#999' }}>正在加载项目数据...</span>
      </div>
    );
  }

  return (
    <div>
      {/* 页面头部 */}
      <div style={{ 
        marginBottom: 32, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            fontSize: 26,
            fontWeight: 600,
            background: 'linear-gradient(120deg, #333 0%, #666 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            项目管理
          </h2>
          <p style={{ 
            margin: '8px 0 0 0', 
            color: '#999',
            fontSize: 14,
          }}>
            共 {projects.length} 个项目
          </p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/projects/create')}
          style={{
            borderRadius: 10,
            height: 48,
            paddingLeft: 24,
            paddingRight: 24,
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
          }}
        >
          新建项目
        </Button>
      </div>

      {projects.length === 0 ? (
        <div style={{
          padding: '80px 0',
          textAlign: 'center',
        }}>
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <FolderOpenOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </div>
          <h3 style={{ 
            fontSize: 18, 
            fontWeight: 600,
            color: '#333',
            marginBottom: 8,
          }}>
            暂无项目
          </h3>
          <p style={{ 
            color: '#999',
            marginBottom: 24,
          }}>
            点击下方按钮创建您的第一个标注项目
          </p>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            size="large"
            onClick={() => navigate('/projects/create')}
            style={{
              borderRadius: 10,
              height: 48,
            }}
          >
            创建项目
          </Button>
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {projects.map((project) => {
            const typeConfig = getAnnotationTypeColor(project.annotation_type);
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/projects/${project.id}`)}
                  style={{
                    borderRadius: 16,
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  styles={{ body: { padding: 20 } }}
                  className="project-card"
                >
                  {/* 顶部标签 */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    padding: '4px 12px',
                    borderRadius: '0 14px 0 12px',
                    background: typeConfig.bg,
                    borderLeft: `1px solid ${typeConfig.border}`,
                    borderBottom: `1px solid ${typeConfig.border}`,
                  }}>
                    <span style={{
                      fontSize: 12,
                      color: typeConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      {getAnnotationTypeIcon(project.annotation_type)}
                      {ANNOTATION_TYPE_CONFIG[project.annotation_type]?.label || project.annotation_type}
                    </span>
                  </div>

                  {/* 项目信息 */}
                  <div style={{ marginBottom: 16, paddingRight: 80 }}>
                    <h3 style={{ 
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 600,
                      color: '#333',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {project.name}
                    </h3>
                  </div>

                  {/* 描述 */}
                  <p style={{ 
                    color: '#666', 
                    marginTop: 8,
                    marginBottom: 20,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    minHeight: 40,
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}>
                    {project.description || '暂无描述'}
                  </p>

                  {/* 统计信息 */}
                  <div style={{ 
                    display: 'flex', 
                    gap: 16,
                    marginBottom: 16,
                    padding: '12px 0',
                    borderTop: '1px solid #f5f5f5',
                    borderBottom: '1px solid #f5f5f5',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <DatabaseOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                      <span style={{ fontSize: 13, color: '#666' }}>0 个数据集</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ClockCircleOutlined style={{ color: '#999', fontSize: 14 }} />
                      <span style={{ fontSize: 13, color: '#999' }}>
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}>
                      <span style={{ fontSize: 12, color: '#999' }}>标注进度</span>
                      <span style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>0%</span>
                    </div>
                    <Progress 
                      percent={0} 
                      showInfo={false}
                      strokeColor={{
                        '0%': '#1890ff',
                        '100%': '#52c41a',
                      }}
                      trailColor="#f0f0f0"
                      size="small"
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 8,
                    }}
                  >
                    <div>
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}`);
                          }}
                          style={{
                            borderRadius: 8,
                          }}
                        >
                          编辑
                        </Button>
                      </Tooltip>
                      <Popconfirm
                        title="确认删除"
                        description="删除后无法恢复，是否继续？"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDelete(project.id);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            borderRadius: 8,
                          }}
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<RightOutlined />}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      style={{
                        color: '#1890ff',
                        fontWeight: 500,
                      }}
                    >
                      查看详情
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* 全局样式 */}
      <style>{`
        .project-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08) !important;
          border-color: rgba(24, 144, 255, 0.3) !important;
        }
        .project-card:hover .enter-detail {
          color: #0969da;
        }
      `}</style>
    </div>
  );
};

export default ProjectList;
