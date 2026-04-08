import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { Project, Dataset, DataItem, Annotation } from '@/types';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  // 使用相对路径，通过 vite proxy 或 nginx 代理到后端
  baseURL: '/api',
  timeout: 30000,
  // 注意：不要在这里设置 Content-Type，让 axios 自动根据请求数据设置
  // 特别是上传文件时需要 multipart/form-data
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等认证信息
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error) => {
    // 统一错误处理
    const status = error.response?.status;
    const data = error.response?.data;

    // 处理 FastAPI 的验证错误格式
    let displayMessage = '请求失败';
    if (Array.isArray(data?.detail)) {
      // FastAPI 返回的验证错误数组
      displayMessage = data.detail.map((err: any) => {
        if (typeof err === 'object') {
          return `${err.loc?.join('.') || 'field'}: ${err.msg || err.type}`;
        }
        return String(err);
      }).join('; ');
    } else if (typeof data?.detail === 'string') {
      displayMessage = data.detail;
    }

    console.error('API Error:', {
      status,
      data,
      detail: data?.detail,
      displayMessage
    });

    return Promise.reject(error);
  }
);

// 项目相关 API
export const projectApi = {
  // 获取项目列表
  getProjects: (page: number = 1, pageSize: number = 20): Promise<Project[]> => {
    return apiClient.get('/projects', { params: { skip: (page - 1) * pageSize, limit: pageSize } });
  },

  // 创建项目
  createProject: (data: Partial<Project>): Promise<Project> => {
    console.log('createProject called with data:', JSON.stringify(data, null, 2));
    return apiClient.post('/projects', data);
  },

  // 获取项目详情
  getProject: (id: number): Promise<Project> => {
    return apiClient.get(`/projects/${id}`);
  },

  // 更新项目
  updateProject: (id: number, data: Partial<Project>): Promise<Project> => {
    return apiClient.put(`/projects/${id}`, data);
  },

  // 删除项目
  deleteProject: (id: number): Promise<void> => {
    return apiClient.delete(`/projects/${id}`);
  },

  // 获取项目统计
  getProjectStats: (id: number): Promise<any> => {
    return apiClient.get(`/projects/${id}/stats`);
  },
};

// 数据集相关 API
export const datasetApi = {
  // 获取数据集列表
  getDatasets: (projectId: number): Promise<Dataset[]> => {
    return apiClient.get(`/projects/${projectId}/datasets`);
  },

  // 获取单个数据集
  getDataset: (id: number): Promise<Dataset> => {
    return apiClient.get(`/datasets/${id}`);
  },

  // 上传数据集
  uploadDataset: (projectId: number, file: File, name: string): Promise<Dataset> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    
    return apiClient.post(`/projects/${projectId}/datasets`, formData);
  },

  // 删除数据集
  deleteDataset: (id: number): Promise<void> => {
    return apiClient.delete(`/datasets/${id}`);
  },

  // 获取数据项列表
  getDataItems: (datasetId: number, page: number = 1, status?: string): Promise<{ items: DataItem[]; total: number }> => {
    const params: any = { skip: (page - 1) * 20, limit: 20 };
    if (status) params.status = status;
    return apiClient.get(`/datasets/${datasetId}/items`, { params });
  },
};

// 标注相关 API
export const annotationApi = {
  // 获取下一条待标注数据
  getNextItem: (datasetId: number): Promise<DataItem | null> => {
    return apiClient.get(`/datasets/${datasetId}/next`);
  },

  // 提交标注
  submitAnnotation: (itemId: number, data: Partial<Annotation>): Promise<Annotation> => {
    return apiClient.post(`/items/${itemId}/annotations`, data);
  },

  // 更新标注
  updateAnnotation: (annotationId: number, data: Partial<Annotation>): Promise<Annotation> => {
    return apiClient.put(`/annotations/${annotationId}`, data);
  },

  // 审核标注
  reviewAnnotation: (annotationId: number, data: { status: 'approved' | 'rejected'; comment?: string }): Promise<Annotation> => {
    return apiClient.put(`/annotations/${annotationId}/review`, data);
  },

  // 批量审核标注
  batchReviewAnnotations: (data: { annotation_ids: number[]; status: 'approved' | 'rejected'; comment?: string }): Promise<{ message: string; count: number }> => {
    return apiClient.post('/annotations/batch-review', data);
  },

  // 批量删除标注
  batchDeleteAnnotations: (data: { annotation_ids: number[] }): Promise<{ message: string; count: number }> => {
    return apiClient.delete('/annotations/batch', { data });
  },

  // 获取数据项的标注
  getItemAnnotations: (itemId: number): Promise<{ items: Annotation[]; total: number }> => {
    return apiClient.get(`/items/${itemId}/annotations`);
  },

  // 获取数据集的标注列表（用于审核）
  getDatasetAnnotations: (datasetId: number, params?: {
    status?: string;
    is_ai?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<{ items: Annotation[]; total: number }> => {
    return apiClient.get(`/datasets/${datasetId}/annotations`, { params });
  },
};

// AI 相关 API
export interface AIConfig {
  provider: 'openai' | 'ollama';
  openai_api_key: string;
  openai_base_url: string;
  openai_model: string;
  ollama_base_url: string;
  ollama_model: string;
  prompt_templates: Record<string, string>;
}

export interface AIAnnotateRequest {
  item_id: number;
  annotation_type?: string;
  config?: Record<string, any>;
  prompt_template?: string;
}

export interface AIAnnotateResponse {
  annotation: {
    type: string;
    content: Record<string, any>;
    is_ai_generated: boolean;
  };
}

export interface AIBatchRequest {
  dataset_id: number;
  annotation_type?: string;
  config?: Record<string, any>;
  prompt_template?: string;
}

export interface AIBatchResponse {
  task_id: string;
  status: string;
  total: number;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export const aiApi = {
  // AI 单条标注
  aiAnnotate: (data: AIAnnotateRequest): Promise<AIAnnotateResponse> => {
    return apiClient.post('/ai/annotate', data);
  },

  // AI 批量标注
  aiBatchAnnotate: (data: AIBatchRequest): Promise<AIBatchResponse> => {
    return apiClient.post('/ai/batch', data);
  },

  // 获取 AI 配置
  getAIConfig: (): Promise<AIConfig> => {
    return apiClient.get('/ai/config');
  },

  // 更新 AI 配置
  updateAIConfig: (data: Partial<AIConfig>): Promise<AIConfig> => {
    return apiClient.put('/ai/config', data);
  },

  // 获取可用模型列表
  getAvailableModels: (): Promise<ModelInfo[]> => {
    return apiClient.get('/ai/models');
  },

  // 测试 AI 连接
  testConnection: (): Promise<{ status: string; message: string }> => {
    return apiClient.post('/ai/test-connection');
  },

  // 查询批量标注进度
  getBatchProgress: (taskId: string): Promise<{ task_id: string; status: string; total: number; completed: number; failed: number }> => {
    return apiClient.get(`/ai/batch/${taskId}/progress`);
  },
};

// 导出相关 API
export const exportApi = {
  // 导出数据集
  exportDataset: (datasetId: number, format: string): Promise<Blob> => {
    return apiClient.get(`/datasets/${datasetId}/export`, {
      params: { format },
      responseType: 'blob',
    });
  },
};

// 统计相关 API
export interface SystemOverview {
  projects: { total: number; by_type: Record<string, number> };
  datasets: { total: number };
  items: { total: number; annotated: number; pending: number; reviewed: number };
  annotations: { total: number; ai_generated: number; approved: number; pending_review: number; rejected: number };
  progress: { annotation: number; review: number; ai_percentage: number };
  recent_projects: { id: number; name: string; annotation_type: string; created_at: string | null }[];
}

export const statsApi = {
  // 获取系统概览
  getOverview: (): Promise<SystemOverview> => {
    return apiClient.get('/stats/overview');
  },
};

export default apiClient;
