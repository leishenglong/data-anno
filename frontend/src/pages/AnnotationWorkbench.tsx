import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Empty,
  Spin,
  message,
  List,
  Badge,
  Divider,
  Row,
  Col,
  Progress,
  Tooltip,
  Select,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CheckOutlined,
  StepForwardOutlined,
  ArrowLeftOutlined,
  SaveOutlined,
  RobotOutlined,
  HolderOutlined,
  ThunderboltOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { datasetApi, annotationApi, projectApi, aiApi } from '@/services/api';
import type { Dataset, DataItem, Project } from '@/types';
import {
  TextClassifier,
  NERAnnotator,
  RelationAnnotator,
  DialogAnnotator,
  ScoreReviewer,
  IncidentReportForm,
  SensorTimeseriesAnnotator,
} from '@/components/annotation';

const AnnotationWorkbench: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [dataItems, setDataItems] = useState<DataItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [annotatedCount, setAnnotatedCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [aiBatching, setAiBatching] = useState(false);
  const [aiBatchProgress, setAiBatchProgress] = useState<{ total: number; completed: number } | null>(null);

  const fetchItemAnnotation = async (itemId: number) => {
    try {
      const result = await annotationApi.getItemAnnotations(itemId);
      if (result && result.items && result.items.length > 0) {
        const latestAnnotation = result.items[result.items.length - 1];
        const content = latestAnnotation.content;

        // 跳过包含错误的标注
        if (content && content.error) {
          setCurrentAnnotation(null);
          return;
        }

        if (project?.annotation_type === 'text_classification') {
          if (content.labels) {
            setCurrentAnnotation(content.labels.length === 1 ? content.labels[0] : content.labels);
          } else if (typeof content === 'string') {
            setCurrentAnnotation(content);
          } else {
            setCurrentAnnotation(null);
          }
        } else {
          setCurrentAnnotation(content);
        }
      } else {
        setCurrentAnnotation(null);
      }
    } catch (error) {
      setCurrentAnnotation(null);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!datasetId) {
        setError('数据集 ID 无效');
        return;
      }

      const dsId = Number(datasetId);
      if (isNaN(dsId) || dsId <= 0) {
        setError('数据集 ID 格式错误');
        return;
      }

      const currentDataset = await datasetApi.getDataset(dsId);
      if (!currentDataset) {
        setError('数据集不存在');
        return;
      }

      setDataset(currentDataset);
      setTotalCount(currentDataset.total_items || 0);
      setAnnotatedCount(currentDataset.annotated_items || 0);

      if (!currentDataset.project_id) {
        setError('数据集未关联项目');
        return;
      }

      const proj = await projectApi.getProject(currentDataset.project_id);
      setProject(proj);

      // 加载所有数据项（支持状态筛选）
      const allItems: DataItem[] = [];
      let pageNum = 1;
      let hasMore = true;
      
      while (hasMore) {
        const itemsRes = await datasetApi.getDataItems(dsId, pageNum, statusFilter);
        if (itemsRes.items && itemsRes.items.length > 0) {
          allItems.push(...itemsRes.items);
          pageNum++;
          // 如果返回的数量少于20，说明没有更多了
          if (itemsRes.items.length < 20) hasMore = false;
        } else {
          hasMore = false;
        }
        // 安全限制，最多加载500条
        if (allItems.length >= 500) hasMore = false;
      }
      
      setDataItems(allItems);

      if (allItems.length > 0) {
        await fetchItemAnnotation(allItems[0].id);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error.message || '请检查网络连接或刷新页面重试';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [datasetId, statusFilter]);

  useEffect(() => {
    const currentItem = dataItems[currentIndex];
    if (currentItem) {
      fetchItemAnnotation(currentItem.id);
    }
  }, [currentIndex, dataItems]);

  const currentItem = dataItems[currentIndex];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCurrentAnnotation(null);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < dataItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentAnnotation(null);
    }
  }, [currentIndex, dataItems.length]);

  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const handleSubmit = useCallback(async () => {
    if (!currentItem || !project) return;

    let annotationContent: Record<string, any>;

    if (currentAnnotation === null || currentAnnotation === undefined) {
      annotationContent = {};
    } else if (typeof currentAnnotation === 'string') {
      annotationContent = { labels: [currentAnnotation] };
    } else if (Array.isArray(currentAnnotation)) {
      annotationContent = { labels: currentAnnotation };
    } else if (typeof currentAnnotation === 'object') {
      annotationContent = currentAnnotation;
    } else {
      annotationContent = {};
    }

    setSubmitting(true);
    try {
      await annotationApi.submitAnnotation(currentItem.id, {
        annotation_type: project.annotation_type,
        content: annotationContent,
      });
      message.success('标注提交成功 ✅');
      
      const updatedItems = [...dataItems];
      updatedItems[currentIndex] = { ...currentItem, status: 'annotated' };
      setDataItems(updatedItems);
      setAnnotatedCount((prev) => prev + 1);
      
      handleNext();
    } catch (error) {
      message.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [currentItem, currentAnnotation, currentIndex, dataItems, handleNext, project]);

  const handleAIAnnotate = useCallback(async () => {
    if (!currentItem || !project) return;

    try {
      const result = await aiApi.aiAnnotate({
        item_id: currentItem.id,
        annotation_type: project.annotation_type,
        config: project.config,
      });

      const content = result.annotation.content;
      
      // 检查 AI 返回是否包含错误
      if (content && content.error) {
        message.error(`AI 标注失败: ${content.error}`);
        return;
      }

      let convertedContent: any;

      if (project.annotation_type === 'text_classification' && content.labels) {
        convertedContent = content.labels.length === 1 ? content.labels[0] : content.labels;
      } else {
        convertedContent = content;
      }

      setCurrentAnnotation(convertedContent);
      message.success('AI 标注完成 ✨');
    } catch (error) {
      message.error('AI 标注失败');
    }
  }, [currentItem, project]);

  const handleAIBatchAnnotate = useCallback(async () => {
    if (!dataset || !project) return;

    const hide = message.loading('正在启动 AI 批量预标注...');

    setAiBatching(true);
    setAiBatchProgress(null);
    try {
      const result = await aiApi.aiBatchAnnotate({
        dataset_id: dataset.id,
        annotation_type: project.annotation_type,
        config: project.config,
      });

      hide();

      if (result.total === 0) {
        message.info('没有待标注的数据');
        setAiBatching(false);
        return;
      }

      message.success(`AI 预标注已启动，共 ${result.total} 条数据`);

      const pollProgress = async () => {
        try {
          const progress = await aiApi.getBatchProgress(result.task_id);
          setAiBatchProgress({ total: progress.total, completed: progress.completed });

          if (progress.status === 'processing') {
            setTimeout(pollProgress, 2000);
          } else {
            message.success(`AI 预标注完成！成功 ${progress.completed} 条`);
            setAiBatching(false);
            setAiBatchProgress(null);
            fetchData();
          }
        } catch {
          setAiBatching(false);
          setAiBatchProgress(null);
        }
      };

      setTimeout(pollProgress, 1000);
    } catch {
      hide();
      message.error('AI 预标注启动失败');
      setAiBatching(false);
    }
  }, [dataset, project, fetchData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Enter':
          if (!submitting) {
            handleSubmit();
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handlePrev();
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleNext();
          }
          break;
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSkip();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, handlePrev, handleNext, handleSkip, submitting]);

  const renderContent = () => {
    if (!currentItem) return null;

    const content = currentItem.content;

    if (content === null || content === undefined) {
      return (
        <div style={{
          padding: 32,
          background: 'linear-gradient(135deg, #fff2f0 0%, #ffebe8 100%)',
          borderRadius: 12,
          border: '1px solid #ffccc7',
          color: '#cf1322',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ margin: 0, fontSize: 15 }}>数据内容为空</p>
        </div>
      );
    }

    if (typeof content === 'string') {
      return (
        <div style={{
          padding: 24,
          background: 'linear-gradient(135deg, #f6ffed 0%, #e6fffb 100%)',
          borderRadius: 12,
          border: '1px solid #b7eb8f',
          fontSize: 15,
          lineHeight: 2,
          whiteSpace: 'pre-wrap',
          color: '#333',
        }}>
          {content}
        </div>
      );
    }

    if (typeof content === 'object') {
      if (content.text) {
        return (
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, #f6ffed 0%, #e6fffb 100%)',
            borderRadius: 12,
            border: '1px solid #b7eb8f',
            fontSize: 15,
            lineHeight: 2,
            color: '#333',
          }}>
            {content.text}
          </div>
        );
      }

      if (content.conversation && Array.isArray(content.conversation)) {
        return (
          <div style={{ padding: 16 }}>
            {content.conversation.map((turn: any, idx: number) => (
              <div key={idx} style={{ 
                marginBottom: 20,
                animation: 'fadeIn 0.3s ease',
              }}>
                <Tag 
                  color={turn?.role === 'assistant' ? 'purple' : 'blue'}
                  style={{ 
                    borderRadius: 20,
                    padding: '4px 14px',
                  }}
                >
                  {turn?.role === 'assistant' ? '🤖 AI' : '👤 用户'}
                </Tag>
                <div style={{
                  marginTop: 10,
                  padding: 16,
                  background: turn?.role === 'assistant' ? '#f9f0ff' : '#e6f4ff',
                  borderRadius: 12,
                  border: `1px solid ${turn?.role === 'assistant' ? '#d3adf7' : '#91caff'}`,
                }}>
                  {turn?.content || turn?.message || ''}
                </div>
              </div>
            ))}
          </div>
        );
      }
    }

    return (
      <pre style={{
        padding: 20,
        background: '#f5f5f5',
        borderRadius: 12,
        overflow: 'auto',
        maxHeight: 400,
        fontSize: 13,
        lineHeight: 1.6,
      }}>
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  };

  const renderAnnotationPanel = () => {
    if (!project || !currentItem) return null;

    const annotationType = project.annotation_type;
    const config = project.config || {};
    const content = currentItem.content;

    switch (annotationType) {
      case 'text_classification':
        return (
          <TextClassifier
            content={content}
            config={config}
            value={currentAnnotation}
            onChange={setCurrentAnnotation}
          />
        );
      case 'ner':
        return (
          <NERAnnotator
            content={content}
            config={config}
            value={currentAnnotation}
            onChange={setCurrentAnnotation}
          />
        );
      case 'relation_extraction':
        return (
          <RelationAnnotator
            content={content}
            config={config}
            value={currentAnnotation}
            onChange={setCurrentAnnotation}
          />
        );
      case 'dialog':
        return (
          <DialogAnnotator
            content={content}
            config={config}
            value={currentAnnotation}
            onChange={setCurrentAnnotation}
          />
        );
      case 'score_review':
        return (
          <ScoreReviewer
            content={content}
            config={config}
            value={currentAnnotation}
            onChange={setCurrentAnnotation}
          />
        );
      case 'incident_report':
        return (
          <IncidentReportForm
            content={content}
            config={config}
            value={currentAnnotation}
            onChange={setCurrentAnnotation}
          />
        );
      case 'sensor_timeseries':
        return (
          <SensorTimeseriesAnnotator
            content={content}
            config={config}
            value={currentAnnotation}
            onChange={setCurrentAnnotation}
          />
        );
      default:
        return (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❓</div>
            <p style={{ color: '#999', margin: 0 }}>未知的标注类型: {annotationType}</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: 600,
        flexDirection: 'column',
        gap: 20,
      }}>
        <Spin size="large" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#333', fontSize: 16, fontWeight: 500 }}>
            正在加载数据...
          </p>
          <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: 13 }}>
            请稍候
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Empty
          description={
            <div>
              <p style={{ color: '#ff4d4f', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>加载失败</p>
              <p style={{ color: '#999', fontSize: 13 }}>{error}</p>
            </div>
          }
        >
          <Space>
            <Button onClick={() => navigate('/projects')}>返回项目列表</Button>
            <Button type="primary" onClick={() => fetchData()}>重新加载</Button>
          </Space>
        </Empty>
      </div>
    );
  }

  if (!dataset || dataItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Empty description="暂无数据">
          <Button type="primary" onClick={() => navigate(-1)}>
            返回
          </Button>
        </Empty>
      </div>
    );
  }

  const currentProgress = totalCount > 0 ? Math.round((annotatedCount / totalCount) * 100) : 0;

  return (
    <div style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部导航栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 20,
        borderBottom: '1px solid #f0f0f0',
      }}>
        {/* 左侧信息 */}
        <Space size={20}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(-1)}
            style={{ borderRadius: 10 }}
          >
            返回
          </Button>
          <div>
            <div style={{ 
              fontSize: 18, 
              fontWeight: 600,
              color: '#333',
              marginBottom: 4,
            }}>
              {dataset.name}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              数据集 ID: {dataset.id}
            </div>
          </div>
        </Space>

        {/* 中间进度 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 20,
          padding: '12px 24px',
          background: '#fafafa',
          borderRadius: 12,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>
              {currentIndex + 1}
              <span style={{ fontSize: 14, fontWeight: 400, color: '#999' }}>
                /{dataItems.length}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>当前条目</div>
          </div>
          <div style={{ width: 1, height: 40, background: '#e8e8e8' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>
              {annotatedCount}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>已标注</div>
          </div>
          <div style={{ width: 1, height: 40, background: '#e8e8e8' }} />
          <div style={{ width: 120 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#666' }}>进度</span>
              <span style={{ fontSize: 11, color: currentProgress === 100 ? '#52c41a' : '#1890ff', fontWeight: 600 }}>
                {currentProgress}%
              </span>
            </div>
            <Progress 
              percent={currentProgress} 
              size="small"
              showInfo={false}
              strokeColor={{
                '0%': '#1890ff',
                '100%': '#52c41a',
              }}
            />
          </div>
        </div>

        {/* 右侧状态 */}
        <Space size={12}>
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 110 }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setCurrentIndex(0); }}
            size="small"
            options={[
              { value: 'pending', label: '⏳ 待标注' },
              { value: 'annotated', label: '✅ 已标注' },
              { value: 'reviewed', label: '👁 已审核' },
            ]}
          />
          {currentItem?.status === 'annotated' && (
            <Badge status="success" text={<span style={{ color: '#52c41a', fontWeight: 500 }}>已标注</span>} />
          )}
          {currentItem?.status === 'pending' && (
            <Badge status="processing" text={<span style={{ color: '#1890ff', fontWeight: 500 }}>待标注</span>} />
          )}
          {currentItem?.status === 'reviewed' && (
            <Badge status="success" text={<span style={{ color: '#722ed1', fontWeight: 500 }}>已审核</span>} />
          )}
          <Tooltip title="AI 批量预标注整个数据集">
            <Button 
              icon={<ThunderboltOutlined />}
              onClick={handleAIBatchAnnotate}
              loading={aiBatching}
              style={{ 
                borderRadius: 10,
                background: aiBatching ? undefined : 'linear-gradient(135deg, #722ed1 0%, #eb2f96 100%)',
                border: 'none',
                color: aiBatching ? undefined : '#fff',
              }}
            >
              {aiBatching && aiBatchProgress
                ? `${aiBatchProgress.completed}/${aiBatchProgress.total}`
                : 'AI 预标注'}
            </Button>
          </Tooltip>
          <Button 
            icon={<RobotOutlined />}
            onClick={handleAIAnnotate}
            style={{ 
              borderRadius: 10,
              background: 'linear-gradient(135deg, #722ed1 0%, #eb2f96 100%)',
              color: '#fff',
              border: 'none',
            }}
          >
            AI 标注
          </Button>
          <Tooltip title="去审核页面">
            <Button 
              icon={<AuditOutlined />}
              onClick={() => navigate(`/review/${datasetId}`)}
              style={{ borderRadius: 10 }}
            >
              审核
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* 主内容区 */}
      <Row gutter={16} style={{ flex: 1, overflow: 'hidden' }}>
        {/* 左侧数据列表 */}
        <Col span={5} style={{ height: '100%', overflow: 'hidden' }}>
          <Card 
            styles={{ body: { padding: 0, height: '100%', overflow: 'auto' } }} 
            style={{ 
              height: '100%',
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
            title={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
              }}>
                <HolderOutlined />
                数据列表
              </div>
            }
          >
            <List
              size="small"
              dataSource={dataItems}
              renderItem={(item, index) => {
                const isActive = index === currentIndex;
                const isAnnotated = item.status === 'annotated';
                return (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      background: isActive 
                        ? 'linear-gradient(90deg, #e6f4ff 0%, #bae0ff 100%)' 
                        : isAnnotated 
                          ? '#f6ffed' 
                          : 'transparent',
                      borderLeft: isActive ? '4px solid #1890ff' : '4px solid transparent',
                      padding: '14px 16px',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => {
                      setCurrentIndex(index);
                      setCurrentAnnotation(null);
                    }}
                  >
                    <Space size={8}>
                      <span style={{ 
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#1890ff' : '#666',
                        fontSize: 13,
                      }}>
                        #{item.id}
                      </span>
                      {isAnnotated && (
                        <CheckOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                      )}
                    </Space>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>

        {/* 中间数据展示 */}
        <Col span={10} style={{ height: '100%', overflow: 'hidden' }}>
          <Card 
            title={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
              }}>
                <span style={{ 
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  📄
                </span>
                数据内容
                <Tag color="blue" style={{ marginLeft: 8, borderRadius: 20 }}>
                  #{currentItem?.id}
                </Tag>
              </div>
            }
            style={{ 
              height: '100%',
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
            styles={{ body: { 
              height: 'calc(100% - 60px)', 
              overflow: 'auto',
              padding: 20,
            } }}
          >
            {renderContent()}
            
            {currentItem.meta_data && (
              <>
                <Divider style={{ margin: '24px 0' }}>元数据</Divider>
                <pre style={{ 
                  padding: 16, 
                  background: '#f5f5f5', 
                  borderRadius: 10,
                  fontSize: 12,
                  overflow: 'auto',
                }}>
                  {JSON.stringify(currentItem.meta_data, null, 2)}
                </pre>
              </>
            )}
          </Card>
        </Col>

        {/* 右侧标注区 */}
        <Col span={9} style={{ height: '100%', overflow: 'hidden' }}>
          <Card 
            title={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
              }}>
                <span style={{ 
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #52c41a 0%, #13c2c2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  ✏️
                </span>
                标注操作
              </div>
            }
            extra={
              currentAnnotation && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={submitting}
                  onClick={handleSubmit}
                  style={{
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    border: 'none',
                  }}
                >
                  保存
                </Button>
              )
            }
            style={{ 
              height: '100%',
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
            styles={{ body: { 
              height: 'calc(100% - 60px)', 
              overflow: 'auto',
              padding: 20,
            } }}
          >
            {renderAnnotationPanel()}
          </Card>
        </Col>
      </Row>

      {/* 底部操作栏 */}
      <div style={{ 
        marginTop: 20, 
        paddingTop: 20,
        borderTop: '1px solid #f0f0f0',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
        }}>
          <Tooltip title="快捷键: Ctrl + ←">
            <Button 
              icon={<LeftOutlined />}
              disabled={currentIndex === 0}
              onClick={handlePrev}
              size="large"
              style={{ borderRadius: 10 }}
            >
              上一条
            </Button>
          </Tooltip>
          <Tooltip title="快捷键: Ctrl + S">
            <Button 
              icon={<StepForwardOutlined />}
              onClick={handleSkip}
              disabled={currentIndex === dataItems.length - 1}
              size="large"
              style={{ borderRadius: 10 }}
            >
              跳过
            </Button>
          </Tooltip>
          <Button 
            type="primary"
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={handleSubmit}
            size="large"
            style={{ 
              borderRadius: 10,
              minWidth: 160,
              background: 'linear-gradient(135deg, #52c41a 0%, #13c2c2 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
            }}
          >
            提交并下一条
          </Button>
          <Tooltip title="快捷键: Ctrl + →">
            <Button 
              icon={<RightOutlined />}
              disabled={currentIndex === dataItems.length - 1}
              onClick={handleNext}
              size="large"
              style={{ borderRadius: 10 }}
            >
              下一条
            </Button>
          </Tooltip>
        </div>
        <div style={{ 
          textAlign: 'center', 
          color: '#999', 
          fontSize: 12,
          marginTop: 12,
        }}>
          💡 快捷键: Enter 提交 | Ctrl+← 上一条 | Ctrl+→ 下一条 | Ctrl+S 跳过
        </div>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AnnotationWorkbench;
