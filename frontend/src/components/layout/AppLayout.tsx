import React, { useState } from 'react';
import { Layout, Menu, theme, Button, Breadcrumb } from 'antd';
import {
  ProjectOutlined,
  EditOutlined,
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/projects')) return 'projects';
    if (path.startsWith('/annotation')) return 'annotation';
    if (path.startsWith('/ai-config')) return 'ai-config';
    return 'projects';
  };

  const menuItems = [
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
      onClick: () => navigate('/projects'),
    },
    {
      key: 'ai-config',
      icon: <RobotOutlined />,
      label: 'AI 配置',
      onClick: () => navigate('/ai-config'),
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
          height: 72, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          gap: 12,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)',
            flexShrink: 0,
          }}>
            <DatabaseOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          {!collapsed && (
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <span style={{ 
                color: '#fff', 
                fontSize: 18, 
                fontWeight: 700,
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
              }}>
                DataAnno
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 11,
                fontWeight: 400,
              }}>
                智能数据标注平台
              </span>
            </div>
          )}
        </div>

        {/* 菜单区域 */}
        <div style={{
          padding: '16px 12px',
          height: 'calc(100vh - 72px - 60px)',
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

      <Layout style={{
        background: 'linear-gradient(180deg, #f5f7fa 0%, #ffffff 100%)',
      }}>
        {/* 顶部导航栏 */}
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          height: 72,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          {/* 左侧：折叠按钮和面包屑 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 18,
                width: 48,
                height: 48,
                borderRadius: 10,
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
                <span style={{ color: '#d9d9d9', margin: '0 4px' }}>/</span>
              }
              style={{ fontSize: 14 }}
            />
          </div>

          {/* 右侧：快捷操作 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: '6px 16px',
              background: 'linear-gradient(135deg, #f6ffed 0%, #e6fffb 100%)',
              borderRadius: 20,
              border: '1px solid #b7eb8f',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#52c41a',
                boxShadow: '0 0 8px rgba(82, 196, 26, 0.5)',
              }} />
              <span style={{ fontSize: 12, color: '#389e0d' }}>系统正常</span>
            </div>
          </div>
        </Header>

        {/* 主内容区 */}
        <Content
          style={{
            margin: 24,
            padding: 28,
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
