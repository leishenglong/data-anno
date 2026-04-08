import React from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ProjectList from '@/pages/ProjectList';
import ProjectCreate from '@/pages/ProjectCreate';
import ProjectDetail from '@/pages/ProjectDetail';
import AnnotationWorkbench from '@/pages/AnnotationWorkbench';
import AnnotationReview from '@/pages/AnnotationReview';
import AIConfig from '@/pages/AIConfig';

const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<ProjectList />} />
            <Route path="projects/create" element={<ProjectCreate />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="annotation/:datasetId" element={<AnnotationWorkbench />} />
            <Route path="review/:datasetId" element={<AnnotationReview />} />
            <Route path="ai-config" element={<AIConfig />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
