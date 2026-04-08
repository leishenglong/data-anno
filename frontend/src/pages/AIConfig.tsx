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
} from 'antd';
import {
  RobotOutlined,
  ApiOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { aiApi } from '@/services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const ANNOTATION_TYPES = [
  { key: 'text_classification', label: '文本分类', description: '对文本进行分类标注' },
  { key: 'ner', label: '实体识别 (NER)', description: '标注文本中的实体' },
  { key: 'relation_extraction', label: '关系抽取', description: '标注实体之间的关系' },
  { key: 'dialog', label: '对话标注', description: '标注多轮对话质量' },
  { key: 'score_review', label: '评分评审', description: '对文本进行多维度评分' },
];

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (推荐)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

const AIConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'ollama'>('openai');
  const [ollamaModels, setOllamaModels] = useState<{ value: string; label: string }[]>([]);
  const [activeTab, setActiveTab] = useState('provider');

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  // 当切换到 Ollama 时加载模型列表
  useEffect(() => {
    if (provider === 'ollama') {
      loadOllamaModels();
    }
  }, [provider]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const config = await aiApi.getAIConfig();
      setProvider(config.provider);
      form.setFieldsValue({
        provider: config.provider,
        openai_api_key: config.openai_api_key,
        openai_base_url: config.openai_base_url,
        openai_model: config.openai_model,
        ollama_base_url: config.ollama_base_url,
        ollama_model: config.ollama_model,
        prompt_templates: config.prompt_templates || {},
      });
    } catch (error) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOllamaModels = async () => {
    try {
      const models = await aiApi.getAvailableModels();
      setOllamaModels(models.map(m => ({ value: m.id, label: m.name })));
    } catch (error) {
      // 如果获取失败，使用默认选项
      setOllamaModels([
        { value: 'llama3.1', label: 'llama3.1' },
        { value: 'llama3', label: 'llama3' },
        { value: 'mistral', label: 'mistral' },
        { value: 'qwen2.5', label: 'qwen2.5' },
      ]);
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
    setTesting(true);
    try {
      const result = await aiApi.testConnection();
      message.success(result.message);
    } catch (error: any) {
      message.error(error.response?.data?.detail || '连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const handleProviderChange = (e: any) => {
    setProvider(e.target.value);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>
        <RobotOutlined style={{ marginRight: 12 }} />
        AI 配置
      </Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        配置 AI 辅助标注服务，支持 OpenAI 兼容 API 和 Ollama 本地模型
      </Text>

      <Spin spinning={loading}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <ApiOutlined />
                服务提供商
              </span>
            }
            key="provider"
          >
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
                  <Radio.Group onChange={handleProviderChange}>
                    <Radio.Button value="openai">
                      <Space>
                        <ThunderboltOutlined />
                        OpenAI / 兼容 API
                      </Space>
                    </Radio.Button>
                    <Radio.Button value="ollama">
                      <Space>
                        <RobotOutlined />
                        Ollama 本地模型
                      </Space>
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>

                {provider === 'openai' ? (
                  <>
                    <Alert
                      message="OpenAI 兼容 API 配置"
                      description="支持 OpenAI 官方 API 以及任何兼容 OpenAI API 格式的第三方服务（如 Azure、智谱 AI、DeepSeek 等）"
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
                        placeholder="sk-..."
                        prefix={<ThunderboltOutlined />}
                      />
                    </Form.Item>
                    <Form.Item
                      name="openai_base_url"
                      label="Base URL"
                      rules={[{ required: true }]}
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
                        options={OPENAI_MODELS}
                        showSearch
                        allowClear
                      />
                    </Form.Item>
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
                        options={ollamaModels}
                        showSearch
                        allowClear
                        dropdownRender={(menu) => (
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
                      测试连接
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <CodeOutlined />
                Prompt 模板
              </span>
            }
            key="templates"
          >
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
          </TabPane>
        </Tabs>
      </Spin>
    </div>
  );
};

export default AIConfigPage;
