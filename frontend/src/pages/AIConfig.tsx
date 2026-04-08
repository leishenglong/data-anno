import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Radio,
  Button,
  message,
  Tabs,
  Space,
  Divider,
  Alert,
  Typography,
  Spin,
  Tag,
} from 'antd';
import {
  RobotOutlined,
  ApiOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  GlobalOutlined,
  CloudServerOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { aiApi, type AIProvider, type ProviderPreset } from '@/services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ANNOTATION_TYPES = [
  { key: 'text_classification', label: '文本分类', description: '对文本进行分类标注' },
  { key: 'ner', label: '实体识别 (NER)', description: '标注文本中的实体' },
  { key: 'relation_extraction', label: '关系抽取', description: '标注实体之间的关系' },
  { key: 'dialog', label: '对话标注', description: '标注多轮对话质量' },
  { key: 'score_review', label: '评分评审', description: '对文本进行多维度评分' },
];

// 提供商图标映射
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  openai: <ThunderboltOutlined />,
  zhipu: <ExperimentOutlined />,
  qwen: <CloudServerOutlined />,
  kimi: <GlobalOutlined />,
  minimax: <RobotOutlined />,
  deepseek: <ApiOutlined />,
  ollama: <RobotOutlined />,
};

// 提供商颜色映射
const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  zhipu: '#4f46e5',
  qwen: '#ff6a00',
  kimi: '#6366f1',
  minimax: '#ec4899',
  deepseek: '#0ea5e9',
  ollama: '#8b5cf6',
};

const AIConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [providerPresets, setProviderPresets] = useState<ProviderPreset[]>([]);
  const [currentModels, setCurrentModels] = useState<{ value: string; label: string }[]>([]);
  const [activeTab, setActiveTab] = useState('provider');

  // 加载配置和提供商预设
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [config, presets] = await Promise.all([
        aiApi.getAIConfig(),
        aiApi.getProviderPresets(),
      ]);
      setProvider(config.provider);
      setProviderPresets(presets);
      form.setFieldsValue({
        provider: config.provider,
        openai_api_key: config.openai_api_key,
        openai_base_url: config.openai_base_url,
        openai_model: config.openai_model,
        ollama_base_url: config.ollama_base_url,
        ollama_model: config.ollama_model,
        prompt_templates: config.prompt_templates || {},
      });
      // 设置当前提供商的模型列表
      updateModelsForProvider(config.provider, presets);
    } catch (error) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const updateModelsForProvider = (providerId: AIProvider, presets?: ProviderPreset[]) => {
    const allPresets = presets || providerPresets;
    const preset = allPresets.find(p => p.id === providerId);
    if (preset) {
      setCurrentModels(preset.models.map(m => ({ value: m.id, label: m.name })));
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await aiApi.updateAIConfig(values);
      message.success('配置保存成功');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    // 先保存配置再测试
    try {
      const values = await form.validateFields();
      setSaving(true);
      await aiApi.updateAIConfig(values);
      setSaving(false);
      
      setTesting(true);
      const result = await aiApi.testConnection();
      message.success(result.message);
    } catch (error: any) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('连接测试失败');
      }
    } finally {
      setTesting(false);
      setSaving(false);
    }
  };

  const handleProviderChange = (e: any) => {
    const newProvider = e.target.value;
    setProvider(newProvider);
    
    if (newProvider === 'ollama') {
      loadOllamaModels();
      return;
    }
    
    // 根据 provider preset 自动填充 base_url 和模型
    const preset = providerPresets.find(p => p.id === newProvider);
    if (preset) {
      form.setFieldsValue({
        openai_base_url: preset.base_url,
        openai_model: preset.models[0]?.id || '',
      });
      setCurrentModels(preset.models.map(m => ({ value: m.id, label: m.name })));
    }
  };

  const loadOllamaModels = async () => {
    try {
      const models = await aiApi.getAvailableModels();
      setCurrentModels(models.map(m => ({ value: m.id, label: m.name })));
    } catch (error) {
      setCurrentModels([
        { value: 'llama3.1', label: 'llama3.1' },
        { value: 'llama3', label: 'llama3' },
        { value: 'mistral', label: 'mistral' },
        { value: 'qwen2.5', label: 'qwen2.5' },
      ]);
    }
  };

  const isCloudProvider = provider !== 'ollama';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>
        <RobotOutlined style={{ marginRight: 12 }} />
        AI 配置
      </Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        配置 AI 辅助标注服务，支持国内外多种大模型提供商
      </Text>

      <Spin spinning={loading}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'provider',
            label: <span><ApiOutlined /> 服务提供商</span>,
            children: (
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{ provider: 'openai' }}
                >
                  <Form.Item
                    name="provider"
                    label="AI 服务提供商"
                    rules={[{ required: true }]}
                  >
                    <Radio.Group onChange={handleProviderChange} optionType="button" buttonStyle="solid">
                      {providerPresets.map(p => (
                        <Radio.Button key={p.id} value={p.id}>
                          <Space>
                            {PROVIDER_ICONS[p.id]}
                            {p.name}
                          </Space>
                        </Radio.Button>
                      ))}
                      <Radio.Button value="ollama">
                        <Space>
                          <RobotOutlined />
                          Ollama 本地
                        </Space>
                      </Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {isCloudProvider ? (
                    <>
                      <Alert
                        message={`${providerPresets.find(p => p.id === provider)?.name || 'OpenAI 兼容 API'} 配置`}
                        description={
                          provider === 'openai' 
                            ? "支持 OpenAI 官方 API 以及任何兼容 OpenAI API 格式的第三方服务"
                            : "国内大模型服务，使用 OpenAI 兼容 API 格式，只需填入对应平台的 API Key 即可使用"
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                      />

                      <Form.Item
                        name="openai_api_key"
                        label="API Key"
                        rules={[{ required: true, message: '请输入 API Key' }]}
                      >
                        <Input.Password
                          placeholder={
                            provider === 'zhipu' ? '填写智谱 AI 的 API Key' :
                            provider === 'qwen' ? '填写阿里云 DashScope API Key' :
                            provider === 'kimi' ? '填写 Moonshot API Key' :
                            provider === 'minimax' ? '填写 MiniMax API Key' :
                            provider === 'deepseek' ? '填写 DeepSeek API Key' :
                            'sk-...'
                          }
                          prefix={<ThunderboltOutlined />}
                        />
                      </Form.Item>

                      <Form.Item
                        name="openai_base_url"
                        label="Base URL"
                        rules={[{ required: true }]}
                        extra="已根据提供商自动填入，一般无需修改"
                      >
                        <Input placeholder="https://api.openai.com/v1" />
                      </Form.Item>

                      <Form.Item
                        name="openai_model"
                        label="模型"
                        rules={[{ required: true }]}
                      >
                        <Select
                          placeholder="选择模型"
                          options={currentModels}
                          showSearch
                          allowClear
                          popupRender={(menu) => (
                            <>
                              {menu}
                              <Divider style={{ margin: '8px 0' }} />
                              <div style={{ padding: '0 8px 4px' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  支持手动输入模型名称
                                </Text>
                              </div>
                            </>
                          )}
                        />
                      </Form.Item>

                      {/* 快速选择其他提供商的提示 */}
                      <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>支持的国内模型提供商：</Text>
                        <Space wrap>
                          {providerPresets.filter(p => p.id !== 'openai').map(p => (
                            <Tag 
                              key={p.id} 
                              color={provider === p.id ? PROVIDER_COLORS[p.id] : undefined}
                              style={{ cursor: 'default' }}
                            >
                              {PROVIDER_ICONS[p.id]} {p.name}
                            </Tag>
                          ))}
                        </Space>
                        <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                          切换上方提供商即可自动配置 Base URL 和模型列表
                        </Text>
                      </div>
                    </>
                  ) : (
                    <>
                      <Alert
                        message="Ollama 本地模型配置"
                        description="需要先在本地安装并运行 Ollama 服务（默认端口 11434）"
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                      />
                      <Form.Item
                        name="ollama_base_url"
                        label="Ollama Base URL"
                        rules={[{ required: true }]}
                      >
                        <Input placeholder="http://localhost:11434" />
                      </Form.Item>
                      <Form.Item
                        name="ollama_model"
                        label="模型"
                        rules={[{ required: true }]}
                      >
                        <Select
                          placeholder="选择模型"
                          options={currentModels}
                          showSearch
                          allowClear
                          popupRender={(menu) => (
                            <>
                              {menu}
                              <Divider style={{ margin: '8px 0' }} />
                              <div style={{ padding: '0 8px 4px' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  提示：如果列表为空，请确保 Ollama 服务正在运行
                                </Text>
                              </div>
                            </>
                          )}
                        />
                      </Form.Item>
                    </>
                  )}

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        loading={saving}
                      >
                        保存配置
                      </Button>
                      <Button
                        icon={<ThunderboltOutlined />}
                        onClick={handleTestConnection}
                        loading={testing}
                      >
                        保存并测试连接
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'templates',
            label: <span><CodeOutlined /> Prompt 模板</span>,
            children: (
              <Card>
                <Alert
                  message="自定义 Prompt 模板"
                  description="为每种标注类型自定义 AI Prompt 模板。使用 {{变量名}} 作为占位符，系统会在运行时替换为实际值。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <Form form={form} layout="vertical">
                  {ANNOTATION_TYPES.map((type) => (
                    <Form.Item
                      key={type.key}
                      name={['prompt_templates', type.key]}
                      label={
                        <Space direction="vertical" size={0}>
                          <Text strong>{type.label}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {type.description}
                          </Text>
                        </Space>
                      }
                    >
                      <TextArea
                        rows={8}
                        placeholder={`输入 ${type.label} 的 Prompt 模板...`}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </Form.Item>
                  ))}

                  <Form.Item>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      loading={saving}
                    >
                      保存模板
                    </Button>
                  </Form.Item>
                </Form>

                <Divider />

                <Title level={5}>可用变量说明</Title>
                <div style={{ background: '#f6ffed', padding: 16, borderRadius: 8 }}>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li><code>{'{{text}}'}</code> - 文本内容</li>
                    <li><code>{'{{labels}}'}</code> - 可用标签列表</li>
                    <li><code>{'{{entity_labels}}'}</code> - 实体类型列表</li>
                    <li><code>{'{{relation_types}}'}</code> - 关系类型列表</li>
                    <li><code>{'{{dimensions}}'}</code> - 评分维度列表</li>
                    <li><code>{'{{max_score}}'}</code> - 最高分数</li>
                    <li><code>{'{{dialog}}'}</code> - 对话内容（JSON 格式）</li>
                  </ul>
                </div>
              </Card>
            ),
          },
        ]} />
      </Spin>
    </div>
  );
};

export default AIConfigPage;
