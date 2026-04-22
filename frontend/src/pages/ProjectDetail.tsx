import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Tag, 
  Button, 
  Table, 
  Space, 
  Progress,
  Popconfirm,
  message,
  Empty,
  Spin,
  Row,
  Col,
  Tooltip,
  Modal,
  Select,
  Badge,
  Input,
} from 'antd';
import { 
  UploadOutlined, 
  DeleteOutlined, 
  EditOutlined,
  PlayCircleOutlined,
  ArrowLeftOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  TagsOutlined,
  HighlightOutlined,
  ApartmentOutlined,
  MessageOutlined,
  StarOutlined,
  DownloadOutlined,
  FileTextOutlined,
  DashboardOutlined,
  AuditOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, datasetApi, exportApi, aiApi } from '@/services/api';
import DataUploader from '@/components/common/DataUploader';
import type { Project, Dataset, AnnotationType } from '@/types';
import { ANNOTATION_TYPE_CONFIG } from '@/types';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [, setStats] = useState<any>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportingDataset, setExportingDataset] = useState<Dataset | null>(null);
  const [exportFormat, setExportFormat] = useState('json');
  const [exportLoading, setExportLoading] = useState(false);
  const [aiBatching, setAiBatching] = useState<number | null>(null); // dataset id being AI batched
  const [aiBatchProgress, setAiBatchProgress] = useState<{ total: number; completed: number } | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchProject = async () => {
    try {
      const projectId = Number(id);
      if (isNaN(projectId)) {
        message.error('无效的项目ID');
        navigate('/projects');
        return;
      }
      const [projectRes, datasetsRes, statsRes] = await Promise.all([
        projectApi.getProject(projectId),
        datasetApi.getDatasets(projectId),
        projectApi.getProjectStats(projectId).catch(() => null),
      ]);
      setProject(projectRes);
      setDatasets(datasetsRes || []);
      setStats(statsRes);
      // 初始化编辑表单
      setEditName(projectRes.name);
      setEditDesc(projectRes.description || '');
    } catch (error) {
      message.error('获取项目信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleDeleteDataset = async (datasetId: number) => {
    try {
      await datasetApi.deleteDataset(datasetId);
      message.success('数据集删除成功');
      fetchProject();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleExportClick = (dataset: Dataset) => {
    setExportingDataset(dataset);
    setExportFormat('json');
    setExportModalVisible(true);
  };

  const handleExport = async () => {
    if (!exportingDataset) return;
    
    setExportLoading(true);
    try {
      const blob = await exportApi.exportDataset(exportingDataset.id, exportFormat);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 设置文件名
      const ext = exportFormat === 'alpaca' || exportFormat === 'sharegpt' ? 'json' : exportFormat;
      link.download = `${exportingDataset.name}_export.${ext}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('导出成功');
      setExportModalVisible(false);
    } catch (error) {
      message.error('导出失败，请检查数据集是否有已标注的数据');
    } finally {
      setExportLoading(false);
    }
  };

  const handleAIBatchAnnotate = async (dataset: Dataset) => {
    if (!project) return;
    setAiBatching(dataset.id);
    setAiBatchProgress(null);
    try {
      const result = await aiApi.aiBatchAnnotate({
        dataset_id: dataset.id,
        annotation_type: project.annotation_type,
        config: project.config,
      });
      
      message.success(`AI 预标注已启动，共 ${result.total} 条数据`);
      
      // 轮询进度
      const pollProgress = async () => {
        try {
          const progress = await aiApi.getBatchProgress(result.task_id);
          setAiBatchProgress({ total: progress.total, completed: progress.completed });
          
          if (progress.status === 'processing') {
            setTimeout(pollProgress, 2000);
          } else {
            message.success(`AI 预标注完成！成功 ${progress.completed} 条，失败 ${progress.failed} 条`);
            setAiBatching(null);
            setAiBatchProgress(null);
            fetchProject();
          }
        } catch {
          // 轮询失败，停止
          setAiBatching(null);
          setAiBatchProgress(null);
        }
      };
      
      setTimeout(pollProgress, 1000);
    } catch (error) {
      message.error('AI 预标注启动失败，请检查 AI 配置');
      setAiBatching(null);
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
        return { bg: '#e6f4ff', color: '#1890ff' };
      case 'ner':
        return { bg: '#f6ffed', color: '#52c41a' };
      case 'relation_extraction':
        return { bg: '#f9f0ff', color: '#722ed1' };
      case 'dialog':
        return { bg: '#fff7e6', color: '#fa8c16' };
      case 'score_review':
        return { bg: '#fffbe6', color: '#faad14' };
      default:
        return { bg: '#f5f5f5', color: '#666' };
    }
  };

  const columns = [
    {
      title: '数据集名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Dataset) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <DatabaseOutlined style={{ color: '#1890ff', fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#333' }}>{text}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.file_name}</div>
          </div>
        </div>
      ),
    },
    {
      title: '数据量',
      dataIndex: 'total_items',
      key: 'total_items',
      width: 180,
      render: (total: number, record: Dataset) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, color: '#333' }}>
            {total.toLocaleString()} <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>条</span>
          </div>
          <div style={{ fontSize: 12, color: '#52c41a', marginTop: 2 }}>
            已标注 {record.annotated_items.toLocaleString()} 条
          </div>
        </div>
      ),
    },
    {
      title: '进度',
      key: 'progress',
      width: 200,
      render: (_: any, record: Dataset) => {
        const percent = record.total_items > 0 
          ? Math.round((record.annotated_items / record.total_items) * 100) 
          : 0;
        return (
          <div style={{ width: '100%', maxWidth: 160 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 12, color: '#666' }}>标注进度</span>
              <span style={{ fontSize: 12, color: percent === 100 ? '#52c41a' : '#1890ff', fontWeight: 600 }}>
                {percent}%
              </span>
            </div>
            <Progress 
              percent={percent} 
              size="small" 
              status={percent === 100 ? 'success' : 'active'}
              strokeColor={{
                '0%': '#1890ff',
                '100%': percent === 100 ? '#52c41a' : '#1890ff',
              }}
            />
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string; bg: string }> = {
          ready: { color: '#52c41a', text: '就绪', bg: '#f6ffed' },
          completed: { color: '#52c41a', text: '已完成', bg: '#f6ffed' },
          processing: { color: '#1890ff', text: '处理中', bg: '#e6f4ff' },
          pending: { color: '#fa8c16', text: '待处理', bg: '#fff7e6' },
          error: { color: '#ff4d4f', text: '错误', bg: '#fff2f0' },
        };
        const config = statusMap[status] || { color: '#999', text: status, bg: '#f5f5f5' };
        return (
          <Badge
            status={status === 'ready' || status === 'completed' ? 'success' : status === 'processing' ? 'processing' : 'error'}
            text={<span style={{ color: config.color }}>{config.text}</span>}
          />
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => (
        <span style={{ color: '#666', fontSize: 13 }}>
          {new Date(date).toLocaleString()}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 360,
      render: (_: any, record: Dataset) => (
        <Space size={8} wrap>
          <Tooltip title="开始标注">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate(`/annotation/${record.id}`)}
              style={{
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
              }}
            >
              标注
            </Button>
          </Tooltip>
          <Tooltip title="审核标注结果">
            <Button
              icon={<AuditOutlined />}
              onClick={() => navigate(`/review/${record.id}`)}
              disabled={record.annotated_items === 0}
              style={{ borderRadius: 8 }}
            >
              审核
            </Button>
          </Tooltip>
          <Tooltip title="AI 一键预标注 - 自动标注所有待标注数据">
            <Button
              icon={<ThunderboltOutlined />}
              loading={aiBatching === record.id}
              onClick={() => handleAIBatchAnnotate(record)}
              disabled={record.annotated_items >= record.total_items}
              style={{
                borderRadius: 8,
                background: aiBatching === record.id ? undefined : 'linear-gradient(135deg, #722ed1 0%, #eb2f96 100%)',
                border: 'none',
                color: aiBatching === record.id ? undefined : '#fff',
              }}
            >
              {aiBatching === record.id && aiBatchProgress
                ? `AI ${aiBatchProgress.completed}/${aiBatchProgress.total}`
                : 'AI 预标注'}
            </Button>
          </Tooltip>
          <Tooltip title="导出标注结果">
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExportClick(record)}
              disabled={record.annotated_items === 0}
              style={{ borderRadius: 8 }}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={() => handleDeleteDataset(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              size="small"
              style={{ borderRadius: 8 }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

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

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Empty description="项目不存在或已被删除">
          <Button type="primary" onClick={() => navigate('/projects')}>
            返回项目列表
          </Button>
        </Empty>
      </div>
    );
  }

  const totalItems = datasets.reduce((sum, d) => sum + d.total_items, 0);
  const annotatedItems = datasets.reduce((sum, d) => sum + d.annotated_items, 0);
  const overallProgress = totalItems > 0 ? Math.round((annotatedItems / totalItems) * 100) : 0;
  const typeConfig = getAnnotationTypeColor(project.annotation_type);

  return (
    <div>
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/projects')}
          style={{
            borderRadius: 8,
            marginRight: 16,
          }}
        >
          返回列表
        </Button>
      </div>

      {/* 项目概览卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card 
            style={{ 
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            }}
            styles={{ body: { padding: 28 } }}
          >
            {/* 项目头部 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#333',
                  }}>
                    {project.name}
                  </h2>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: typeConfig.bg,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    {getAnnotationTypeIcon(project.annotation_type)}
                    <span style={{ color: typeConfig.color, fontSize: 13, fontWeight: 500 }}>
                      {ANNOTATION_TYPE_CONFIG[project.annotation_type]?.label}
                    </span>
                  </div>
                </div>
                <p style={{ 
                  color: '#666', 
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}>
                  {project.description || '暂无描述'}
                </p>
              </div>
              <Button 
                icon={<EditOutlined />} 
                onClick={() => setEditModalVisible(true)}
                style={{ borderRadius: 8 }}
              >
                编辑项目
              </Button>
            </div>

            {/* 统计数据 */}
            <Row gutter={[40, 24]}>
              <Col>
                <div style={{
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
                  borderRadius: 12,
                  minWidth: 140,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <DatabaseOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontSize: 12, color: '#666' }}>数据集数量</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1890ff' }}>
                    {datasets.length}
                    <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>个</span>
                  </div>
                </div>
              </Col>
              <Col>
                <div style={{
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                  borderRadius: 12,
                  minWidth: 140,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <FileTextOutlined style={{ color: '#52c41a' }} />
                    <span style={{ fontSize: 12, color: '#666' }}>总数据量</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>
                    {totalItems.toLocaleString()}
                    <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>条</span>
                  </div>
                </div>
              </Col>
              <Col>
                <div style={{
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)',
                  borderRadius: 12,
                  minWidth: 140,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <CheckCircleOutlined style={{ color: '#fa8c16' }} />
                    <span style={{ fontSize: 12, color: '#666' }}>已标注</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#fa8c16' }}>
                    {annotatedItems.toLocaleString()}
                    <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>条</span>
                  </div>
                </div>
              </Col>
              <Col>
                <div style={{
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)',
                  borderRadius: 12,
                  minWidth: 160,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}>
                  <Progress 
                    type="dashboard" 
                    percent={Number(overallProgress) || 0} 
                    size={64}
                    strokeColor={{
                      '0%': '#1890ff',
                      '100%': '#722ed1',
                    }}
                    format={() => (
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#722ed1' }}>
                        {overallProgress}%
                      </span>
                    )}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: '#666' }}>整体进度</div>
                    <div style={{ fontSize: 14, color: '#722ed1', fontWeight: 600 }}>
                      {overallProgress === 100 ? '全部完成' : '进行中'}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 数据集列表 */}
        <Col span={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <DatabaseOutlined style={{ color: '#fff', fontSize: 18 }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>数据集列表</div>
                  <div style={{ fontSize: 12, color: '#999' }}>管理您的标注数据</div>
                </div>
              </div>
            }
            extra={
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setUploadVisible(true)}
                style={{
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                }}
              >
                上传数据集
              </Button>
            }
            style={{
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            }}
            styles={{ body: { padding: 0 } }}
          >
            {datasets.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <UploadOutlined style={{ fontSize: 32, color: '#999' }} />
                </div>
                <p style={{ color: '#999', marginBottom: 16 }}>暂无数据集，请上传数据开始标注</p>
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={datasets}
                rowKey="id"
                pagination={false}
                rowClassName={() => 'dataset-row'}
              />
            )}
          </Card>
        </Col>

        {/* 项目配置 */}
        {project.config && (
          <Col span={24}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <DashboardOutlined style={{ color: '#1890ff', fontSize: 20 }} />
                  <span style={{ fontWeight: 600 }}>项目配置</span>
                </div>
              }
              style={{ 
                borderRadius: 16,
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              }}
              styles={{ body: { padding: 24 } }}
            >
              <Row gutter={[24, 16]}>
                {project.config.labels && project.config.labels.length > 0 && (
                  <Col span={12}>
                    <div style={{
                      padding: 16,
                      background: '#f9f9f9',
                      borderRadius: 12,
                    }}>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>标签配置</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {project.config.labels.map((label, idx) => (
                          <Tag 
                            key={idx} 
                            color={label.color}
                            style={{ 
                              borderRadius: 20,
                              padding: '2px 12px',
                              fontSize: 13,
                            }}
                          >
                            {label.name}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </Col>
                )}
                {project.config.entity_labels && project.config.entity_labels.length > 0 && (
                  <Col span={12}>
                    <div style={{
                      padding: 16,
                      background: '#f9f9f9',
                      borderRadius: 12,
                    }}>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>实体标签</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {project.config.entity_labels.map((label, idx) => (
                          <Tag 
                            key={idx} 
                            color={label.color}
                            style={{ 
                              borderRadius: 20,
                              padding: '2px 12px',
                              fontSize: 13,
                            }}
                          >
                            {label.name}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </Col>
                )}
                {project.config.relation_types && project.config.relation_types.length > 0 && (
                  <Col span={12}>
                    <div style={{
                      padding: 16,
                      background: '#f9f9f9',
                      borderRadius: 12,
                    }}>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>关系类型</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {project.config.relation_types.map((type, idx) => (
                          <Tag key={idx} style={{ borderRadius: 20, padding: '2px 12px', fontSize: 13 }}>
                            {type}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </Col>
                )}
                {project.config.score_dimensions && project.config.score_dimensions.length > 0 && (
                  <Col span={12}>
                    <div style={{
                      padding: 16,
                      background: '#f9f9f9',
                      borderRadius: 12,
                    }}>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>评分维度</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {project.config.score_dimensions.map((dim, idx) => (
                          <Tag key={idx} style={{ borderRadius: 20, padding: '2px 12px', fontSize: 13 }}>
                            {dim.name}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </Col>
                )}
                {project.config.max_score && (
                  <Col span={12}>
                    <div style={{
                      padding: 16,
                      background: '#f9f9f9',
                      borderRadius: 12,
                    }}>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>最高分</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>
                        {project.config.max_score} <span style={{ fontSize: 14, fontWeight: 400 }}>分</span>
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>
        )}
      </Row>

      {/* 上传组件 */}
      <DataUploader
        projectId={Number(id)}
        visible={uploadVisible}
        onCancel={() => setUploadVisible(false)}
        onSuccess={() => {
          setUploadVisible(false);
          fetchProject();
        }}
      />

      {/* 编辑项目弹窗 */}
      <Modal
        title="编辑项目"
        open={editModalVisible}
        onOk={async () => {
          if (!project) return;
          try {
            await projectApi.updateProject(project.id, {
              name: editName,
              description: editDesc,
            });
            message.success('项目更新成功');
            setEditModalVisible(false);
            fetchProject();
          } catch {
            message.error('更新失败');
          }
        }}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>项目名称</div>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="输入项目名称"
              size="large"
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>项目描述</div>
            <Input.TextArea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="输入项目描述"
              rows={4}
              size="large"
            />
          </div>
        </div>
      </Modal>

      {/* 导出弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DownloadOutlined style={{ color: '#1890ff' }} />
            <span>导出数据集</span>
          </div>
        }
        open={exportModalVisible}
        onOk={handleExport}
        onCancel={() => setExportModalVisible(false)}
        confirmLoading={exportLoading}
        okText="导出"
        cancelText="取消"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
            border: 'none',
          }
        }}
        width={480}
      >
        <div style={{ padding: '20px 0' }}>
          <div style={{
            padding: 16,
            background: '#f6ffed',
            borderRadius: 12,
            marginBottom: 20,
            border: '1px solid #b7eb8f',
          }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>数据集</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{exportingDataset?.name}</div>
          </div>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#333', fontWeight: 500 }}>选择导出格式：</div>
          <Select
            value={exportFormat}
            onChange={setExportFormat}
            style={{ width: '100%' }}
            size="large"
            options={[
              { value: 'json', label: '📄 JSON - 完整数据格式' },
              { value: 'jsonl', label: '📝 JSONL - 每行一个JSON' },
              { value: 'csv', label: '📊 CSV - 表格格式（适合Excel）' },
              { value: 'alpaca', label: '🎯 Alpaca - 指令微调训练格式' },
              { value: 'sharegpt', label: '💬 ShareGPT - 对话训练格式' },
            ]}
          />
          <div style={{ 
            marginTop: 16, 
            padding: 14, 
            background: '#f5f7fa', 
            borderRadius: 10,
            fontSize: 13,
            color: '#666',
            lineHeight: 1.6,
          }}>
            {exportFormat === 'json' && '导出包含原始数据、标注结果和元数据的完整JSON格式'}
            {exportFormat === 'jsonl' && '每行一个JSON对象，适合流式处理大文件'}
            {exportFormat === 'csv' && '表格格式，可直接用Excel打开，包含UTF-8 BOM'}
            {exportFormat === 'alpaca' && 'Alpaca训练格式：{instruction, input, output}'}
            {exportFormat === 'sharegpt' && 'ShareGPT对话格式：{conversations: [{from, value}]}'}
          </div>
        </div>
      </Modal>

      {/* 全局样式 */}
      <style>{`
        .dataset-row:hover {
          background: #fafafa !important;
        }
        .dataset-row td {
          padding: 16px 20px !important;
        }
      `}</style>
    </div>
  );
};

export default ProjectDetail;
