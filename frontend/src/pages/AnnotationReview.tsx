import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Tag, Space, Button, Select, Badge, Modal, Input, message,
  Popconfirm, Tooltip, Spin, Empty, Row, Col, Statistic, Checkbox,
} from 'antd';
import {
  AuditOutlined, CheckCircleOutlined, CloseCircleOutlined, RobotOutlined,
  DeleteOutlined, EyeOutlined, ArrowLeftOutlined, UserOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { datasetApi, annotationApi, projectApi } from '@/services/api';
import type { Dataset, Project, Annotation } from '@/types';

const { TextArea } = Input;

const AnnotationReview: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterAi, setFilterAi] = useState<boolean | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailAnnotation, setDetailAnnotation] = useState<Annotation | null>(null);

  const fetchData = useCallback(async () => {
    if (!datasetId) return;
    try {
      setLoading(true);
      const dsId = Number(datasetId);
      const ds = await datasetApi.getDataset(dsId);
      setDataset(ds);

      if (ds.project_id) {
        const proj = await projectApi.getProject(ds.project_id);
        setProject(proj);
      }

      const result = await annotationApi.getDatasetAnnotations(dsId, {
        status: filterStatus,
        is_ai: filterAi,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      });
      setAnnotations(result.items || []);
      setTotal(result.total);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [datasetId, page, pageSize, filterStatus, filterAi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBatchReview = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要审核的标注');
      return;
    }
    setReviewModalVisible(true);
  };

  const confirmBatchReview = async () => {
    setReviewing(true);
    try {
      await annotationApi.batchReviewAnnotations({
        annotation_ids: selectedRowKeys as number[],
        status: reviewAction,
        comment: reviewComment || undefined,
      });
      message.success(`批量${reviewAction === 'approved' ? '通过' : '拒绝'}成功`);
      setSelectedRowKeys([]);
      setReviewModalVisible(false);
      setReviewComment('');
      fetchData();
    } catch {
      message.error('操作失败');
    } finally {
      setReviewing(false);
    }
  };

  const handleSingleReview = async (annotationId: number, status: 'approved' | 'rejected') => {
    try {
      await annotationApi.reviewAnnotation(annotationId, { status });
      message.success(status === 'approved' ? '已通过' : '已拒绝');
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleViewDetail = (annotation: Annotation) => {
    setDetailAnnotation(annotation);
    setDetailModalVisible(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge status="success" text={<span style={{ color: '#52c41a' }}>已通过</span>} />;
      case 'rejected': return <Badge status="error" text={<span style={{ color: '#ff4d4f' }}>已拒绝</span>} />;
      default: return <Badge status="processing" text={<span style={{ color: '#1890ff' }}>待审核</span>} />;
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

  const renderAnnotationContent = (content: any, type: string) => {
    if (!content || typeof content !== 'object') return '-';
    
    if (type === 'text_classification' && content.labels) {
      return content.labels.map((l: string, i: number) => <Tag key={i} color="blue">{l}</Tag>);
    }
    if (type === 'ner' && content.entities) {
      return content.entities.map((e: any, i: number) => (
        <Tag key={i} color="green">{e.label}: {e.text}</Tag>
      ));
    }
    if (type === 'relation_extraction' && content.relations) {
      return content.relations.map((r: any, i: number) => (
        <Tag key={i} color="purple">{r.type}</Tag>
      ));
    }
    if (type === 'score_review' && content.scores) {
      return Object.entries(content.scores).map(([k, v], i) => (
        <Tag key={i} color="orange">{k}: {v as number}</Tag>
      ));
    }
    if (type === 'dialog') {
      if (content.overall_score) return <Tag color="gold">评分: {content.overall_score}</Tag>;
      if (content.quality) return <Tag color="gold">质量: {content.quality}</Tag>;
    }
    
    return <span style={{ fontSize: 12, color: '#999' }}>{JSON.stringify(content).slice(0, 80)}...</span>;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '数据项',
      dataIndex: 'item_id',
      key: 'item_id',
      width: 80,
      render: (id: number) => <span style={{ color: '#1890ff' }}>#{id}</span>,
    },
    {
      title: '标注类型',
      dataIndex: 'annotation_type',
      key: 'annotation_type',
      width: 100,
      render: (type: string) => <Tag>{getTypeLabel(type)}</Tag>,
    },
    {
      title: '标注内容',
      dataIndex: 'content',
      key: 'content',
      width: 300,
      render: (content: any, record: Annotation) => renderAnnotationContent(content, record.annotation_type),
    },
    {
      title: '来源',
      dataIndex: 'is_ai_generated',
      key: 'is_ai_generated',
      width: 80,
      render: (isAi: boolean) => isAi
        ? <Tag color="purple" icon={<RobotOutlined />}>AI</Tag>
        : <Tag color="blue" icon={<UserOutlined />}>人工</Tag>,
    },
    {
      title: '审核状态',
      dataIndex: 'review_status',
      key: 'review_status',
      width: 100,
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => <span style={{ fontSize: 12, color: '#999' }}>{new Date(date).toLocaleString()}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Annotation) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          {record.review_status === 'pending' && (
            <>
              <Tooltip title="通过">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleSingleReview(record.id, 'approved')}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                />
              </Tooltip>
              <Tooltip title="拒绝">
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleSingleReview(record.id, 'rejected')}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const pendingCount = annotations.filter(a => a.review_status === 'pending').length;
  const approvedCount = annotations.filter(a => a.review_status === 'approved').length;

  return (
    <div>
      {/* 顶部导航 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <div>
            <h3 style={{ margin: 0 }}>{dataset?.name || '数据集'} - 标注审核</h3>
            <span style={{ fontSize: 12, color: '#999' }}>共 {total} 条标注</span>
          </div>
        </Space>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button type="primary" icon={<AuditOutlined />} onClick={handleBatchReview}>
              批量审核 ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
      </div>

      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small" bodyStyle={{ padding: 16 }}>
            <Statistic title="待审核" value={pendingCount} valueStyle={{ color: '#1890ff' }} prefix={<AuditOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" bodyStyle={{ padding: 16 }}>
            <Statistic title="已通过" value={approvedCount} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" bodyStyle={{ padding: 16 }}>
            <Statistic title="总标注" value={total} valueStyle={{ color: '#722ed1' }} prefix={<AuditOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <FilterOutlined style={{ color: '#999' }} />
          <span style={{ color: '#666', fontSize: 13 }}>筛选：</span>
          <Select
            placeholder="审核状态"
            allowClear
            style={{ width: 120 }}
            value={filterStatus}
            onChange={setFilterStatus}
            size="small"
            options={[
              { value: 'pending', label: '待审核' },
              { value: 'approved', label: '已通过' },
              { value: 'rejected', label: '已拒绝' },
            ]}
          />
          <Select
            placeholder="标注来源"
            allowClear
            style={{ width: 120 }}
            value={filterAi === undefined ? undefined : filterAi ? 'ai' : 'human'}
            onChange={(v) => setFilterAi(v === 'ai' ? true : v === 'human' ? false : undefined)}
            size="small"
            options={[
              { value: 'ai', label: 'AI 生成' },
              { value: 'human', label: '人工标注' },
            ]}
          />
        </Space>
      </Card>

      {/* 标注列表 */}
      <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
        ) : annotations.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Empty description="暂无标注记录" />
          </div>
        ) : (
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (record: Annotation) => ({
                disabled: record.review_status !== 'pending',
              }),
            }}
            columns={columns}
            dataSource={annotations}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: false,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (p) => setPage(p),
            }}
            size="small"
          />
        )}
      </Card>

      {/* 批量审核弹窗 */}
      <Modal
        title="批量审核"
        open={reviewModalVisible}
        onOk={confirmBatchReview}
        onCancel={() => { setReviewModalVisible(false); setReviewComment(''); }}
        confirmLoading={reviewing}
        okText="确认"
        cancelText="取消"
      >
        <div style={{ padding: '16px 0' }}>
          <p>将审核 <strong>{selectedRowKeys.length}</strong> 条标注</p>
          <div style={{ marginBottom: 16 }}>
            <span style={{ marginRight: 12 }}>审核结果：</span>
            <Select
              value={reviewAction}
              onChange={setReviewAction}
              style={{ width: 120 }}
              options={[
                { value: 'approved', label: '✅ 通过' },
                { value: 'rejected', label: '❌ 拒绝' },
              ]}
            />
          </div>
          <TextArea
            placeholder="审核意见（可选）"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="标注详情"
        open={detailModalVisible}
        onCancel={() => { setDetailModalVisible(false); setDetailAnnotation(null); }}
        footer={null}
        width={600}
      >
        {detailAnnotation && (
          <div>
            <Row gutter={[16, 12]}>
              <Col span={12}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>标注 ID</div>
                <div>{detailAnnotation.id}</div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>数据项 ID</div>
                <div>#{detailAnnotation.item_id}</div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>标注类型</div>
                <Tag>{getTypeLabel(detailAnnotation.annotation_type)}</Tag>
              </Col>
              <Col span={12}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>来源</div>
                {detailAnnotation.is_ai_generated
                  ? <Tag color="purple" icon={<RobotOutlined />}>AI 生成</Tag>
                  : <Tag color="blue" icon={<UserOutlined />}>人工标注</Tag>
                }
              </Col>
              <Col span={12}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>审核状态</div>
                {getStatusBadge(detailAnnotation.review_status)}
              </Col>
              <Col span={12}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>创建时间</div>
                <div style={{ fontSize: 13 }}>{new Date(detailAnnotation.created_at).toLocaleString()}</div>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>标注内容</div>
              <pre style={{
                padding: 16, background: '#f5f5f5', borderRadius: 8,
                fontSize: 13, overflow: 'auto', maxHeight: 300,
              }}>
                {JSON.stringify(detailAnnotation.content, null, 2)}
              </pre>
            </div>
            {detailAnnotation.review_status === 'pending' && (
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Space>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => {
                      handleSingleReview(detailAnnotation.id, 'rejected');
                      setDetailModalVisible(false);
                    }}
                  >
                    拒绝
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    onClick={() => {
                      handleSingleReview(detailAnnotation.id, 'approved');
                      setDetailModalVisible(false);
                    }}
                  >
                    通过
                  </Button>
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AnnotationReview;
