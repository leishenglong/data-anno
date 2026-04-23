import React, { useEffect, useState } from 'react';
import { Layout, Menu, theme, Button, Breadcrumb, Modal, Select, Spin, Empty } from 'antd';
import {
  ProjectOutlined,
  EditOutlined,
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  AuditOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { projectApi, datasetApi } from '@/services/api';
import type { Project, Dataset } from '@/types';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 数据集选择弹窗
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'annotation' | 'review'>('annotation');
  const [pickerProjects, setPickerProjects] = useState<Project[]>([]);
  const [pickerDatasets, setPickerDatasets] = useState<Dataset[]>([]);
  const [pickerProjectId, setPickerProjectId] = useState<number | undefined>(undefined);
  const [pickerLoading, setPickerLoading] = useState(false);

  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/projects')) return 'projects';
    if (path.startsWith('/annotation')) return 'annotation';
    if (path.startsWith('/review')) return 'review';
    if (path.startsWith('/ai-config')) return 'ai-config';
    return 'dashboard';
  };

  const openPicker = async (mode: 'annotation' | 'review') => {
    setPickerMode(mode);
    setPickerProjectId(undefined);
    setPickerDatasets([]);
    setPickerVisible(true);
    setPickerLoading(true);
    try {
      const projects = await projectApi.getProjects(1, 100);
      setPickerProjects(projects);
      if (projects.length > 0) {
        setPickerProjectId(projects[0].id);
      }
    } catch {
      // ignore
    } finally {
      setPickerLoading(false);
    }
  };

  useEffect(() => {
    if (pickerProjectId) {
      datasetApi.getDatasets(pickerProjectId).then(setPickerDatasets).catch(() => {});
    } else {
      setPickerDatasets([]);
    }
  }, [pickerProjectId]);

  const handlePickerSelect = (datasetId: number) => {
    setPickerVisible(false);
    if (pickerMode === 'annotation') {
      navigate(`/annotation/${datasetId}`);
    } else {
      navigate(`/review/${datasetId}`);
    }
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '系统概览',
      onClick: () => navigate('/'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'grp-main',
      label: collapsed ? null : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>核心功能</span>,
      type: 'group' as const,
      children: [
        {
          key: 'projects',
          icon: <ProjectOutlined />,
          label: '项目管理',
          onClick: () => navigate('/projects'),
        },
        {
          key: 'annotation',
          icon: <EditOutlined />,
          label: '标注工作台',
          onClick: () => openPicker('annotation'),
        },
        {
          key: 'review',
          icon: <AuditOutlined />,
          label: '标注审核',
          onClick: () => openPicker('review'),
        },
      ],
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'grp-tools',
      label: collapsed ? null : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>系统设置</span>,
      type: 'group' as const,
      children: [
        {
          key: 'ai-config',
          icon: <RobotOutlined />,
          label: 'AI 配置',
          onClick: () => navigate('/ai-config'),
        },
      ],
    },
  ];

  // 生成面包屑
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const items: { title: string; onClick?: () => void }[] = [{ title: '首页', onClick: () => navigate('/') }];
    
    if (paths[0] === 'projects') {
      items.push({ title: '项目管理', onClick: () => navigate('/projects') });
      if (paths[1] === 'create') {
        items.push({ title: '创建项目' });
      } else if (paths[1] && !isNaN(Number(paths[1]))) {
        items.push({ title: '项目详情' });
      }
    } else if (paths[0] === 'annotation') {
      items.push({ title: '标注工作台' });
    } else if (paths[0] === 'review') {
      items.push({ title: '标注审核' });
    } else if (paths[0] === 'ai-config') {
      items.push({ title: 'AI 配置' });
    }
    
    return items;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={240}
        collapsedWidth={80}
        style={{
          background: 'linear-gradient(180deg, #001529 0%, #002140 100%)',
          boxShadow: '4px 0 10px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Logo 区域 */}
        <div style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          gap: 10,
          cursor: 'pointer',
        }}
          onClick={() => navigate('/')}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)',
            flexShrink: 0,
          }}>
            <DatabaseOutlined style={{ fontSize: 16, color: '#fff' }} />
          </div>
          {!collapsed && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <span style={{
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
              }}>
                DataAnno
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 10,
                fontWeight: 400,
              }}>
                智能数据标注
              </span>
            </div>
          )}
        </div>

        {/* 菜单区域 */}
        <div style={{
          padding: '8px 12px',
          height: 'calc(100vh - 52px - 60px)',
          overflowY: 'auto',
        }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            style={{ 
              borderRight: 0,
              background: 'transparent',
            }}
          />
        </div>

        {/* 底部版本信息 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          {!collapsed && (
            <span style={{ 
              color: 'rgba(255,255,255,0.35)', 
              fontSize: 11,
            }}>
              v1.0.0
            </span>
          )}
        </div>
      </Sider>

      {/* 数据集选择弹窗 */}
      <Modal
        title={pickerMode === 'annotation' ? '选择数据集 - 标注工作台' : '选择数据集 - 标注审核'}
        open={pickerVisible}
        onCancel={() => setPickerVisible(false)}
        footer={null}
        width={520}
      >
        <Spin spinning={pickerLoading}>
          {pickerProjects.length === 0 && !pickerLoading ? (
            <Empty description="暂无项目，请先创建项目并上传数据集" style={{ padding: '40px 0' }}>
              <Button type="primary" onClick={() => { setPickerVisible(false); navigate('/projects/create'); }}>
                创建项目
              </Button>
            </Empty>
          ) : (
            <div style={{ padding: '8px 0' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500, color: '#333' }}>选择项目</div>
                <Select
                  style={{ width: '100%' }}
                  placeholder="请选择项目"
                  value={pickerProjectId}
                  onChange={setPickerProjectId}
                  size="large"
                  options={pickerProjects.map(p => ({ value: p.id, label: p.name }))}
                />
              </div>
              {pickerProjectId && (
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500, color: '#333' }}>选择数据集</div>
                  {pickerDatasets.length === 0 ? (
                    <Empty description="该项目暂无数据集" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '20px 0' }}>
                      <Button size="small" onClick={() => { setPickerVisible(false); navigate(`/projects/${pickerProjectId}`); }}>
                        上传数据集
                      </Button>
                    </Empty>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                      {pickerDatasets.map(ds => (
                        <div
                          key={ds.id}
                          style={{
                            padding: '12px 16px',
                            background: '#fafafa',
                            borderRadius: 10,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                            border: '1px solid transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e6f4ff';
                            e.currentTarget.style.borderColor = '#1890ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fafafa';
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                          onClick={() => handlePickerSelect(ds.id)}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#333', marginBottom: 4 }}>
                              <DatabaseOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                              {ds.name}
                            </div>
                            <span style={{ fontSize: 12, color: '#999' }}>
                              {ds.total_items} 条数据 · 已标注 {ds.annotated_items} 条
                            </span>
                          </div>
                          <RightOutlined style={{ color: '#ccc', fontSize: 12 }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Spin>
      </Modal>

      <Layout style={{
        background: 'linear-gradient(180deg, #f5f7fa 0%, #ffffff 100%)',
      }}>
        {/* 顶部导航栏 */}
        <Header style={{
          padding: '0 16px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          height: 52,
          lineHeight: '52px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          {/* 左侧：折叠按钮和面包屑 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 16,
                width: 36,
                height: 36,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              className="hover-scale"
            />
            <Breadcrumb
              items={getBreadcrumbs()}
              separator={
                <span style={{ color: '#d9d9d9', margin: '0 2px' }}>/</span>
              }
              style={{ fontSize: 13 }}
            />
          </div>

          {/* 右侧：快捷操作 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: '2px 8px',
              background: 'linear-gradient(135deg, #f6ffed 0%, #e6fffb 100%)',
              borderRadius: 12,
              border: '1px solid #b7eb8f',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              <div style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#52c41a',
                boxShadow: '0 0 6px rgba(82, 196, 26, 0.5)',
              }} />
              <span style={{ fontSize: 10, color: '#389e0d', lineHeight: 1 }}>系统正常</span>
            </div>
          </div>
        </Header>

        {/* 主内容区 */}
        <Content
          style={{
            margin: 16,
            padding: 20,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            border: '1px solid rgba(0, 0, 0, 0.04)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* 全局样式 */}
      <style>{`
        .hover-scale:hover {
          background: rgba(24, 144, 255, 0.08) !important;
          transform: scale(1.05);
        }
        .ant-menu-item {
          border-radius: 10px !important;
          margin: 4px 0 !important;
          height: 48px !important;
          line-height: 48px !important;
        }
        .ant-menu-item-selected {
          background: linear-gradient(135deg, rgba(24, 144, 255, 0.15) 0%, rgba(114, 46, 209, 0.15) 100%) !important;
        }
        .ant-menu-item-selected::after {
          display: none;
        }
        .ant-menu-item-group-title {
          padding: 12px 16px 4px !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
        }
        .ant-menu-dark .ant-menu-item-group-title {
          color: rgba(255,255,255,0.35) !important;
        }
        .ant-breadcrumb-link {
          color: #666 !important;
        }
        .ant-breadcrumb-link:hover {
          color: #1890ff !important;
        }
      `}</style>
    </Layout>
  );
};

export default AppLayout;
