import React from 'react';
import { Form, Select, Input, Button, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { IncidentReportAnnotation } from '../../types';

interface IncidentReportFormProps {
  content: any;
  config: any;
  value: IncidentReportAnnotation | null;
  onChange: (value: IncidentReportAnnotation) => void;
}

const { TextArea } = Input;

const IncidentReportForm: React.FC<IncidentReportFormProps> = ({
  content: _content,
  config,
  value,
  onChange,
}) => {
  const [form] = Form.useForm();

  // 从 config 中获取可选值
  const incidentTypes: string[] = config?.incident_types || [
    '瓦斯突出', '瓦斯爆炸', '煤与瓦斯突出',
    '透水', '顶板事故', '机电事故', '运输事故', '其他'
  ];
  const incidentLevels: string[] = config?.incident_levels || ['一般', '较大', '重大', '特别重大'];
  const causes: string[] = config?.causes || [
    '地质构造', '违规操作', '设备故障', '自然因素', '管理缺陷', '其他'
  ];

  // 初始化表单值
  React.useEffect(() => {
    if (value) {
      form.setFieldsValue(value);
    }
  }, [value]);

  const handleValuesChange = () => {
    const values = form.getFieldsValue();
    onChange(values);
  };

  const attachments = form.getFieldValue('attachments') || [];

  const addAttachment = () => {
    const newAttachments = [...attachments, { type: 'image', url: '' }];
    form.setFieldValue('attachments', newAttachments);
    handleValuesChange();
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_: any, i: number) => i !== index);
    form.setFieldValue('attachments', newAttachments);
    handleValuesChange();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleValuesChange}
    >
      <Form.Item
        name="incident_type"
        label="事故类型"
        rules={[{ required: true, message: '请选择事故类型' }]}
      >
        <Select placeholder="请选择">
          {incidentTypes.map(t => (
            <Select.Option key={t} value={t}>{t}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="incident_level"
        label="等级"
        rules={[{ required: true, message: '请选择等级' }]}
      >
        <Select placeholder="请选择">
          {incidentLevels.map(l => (
            <Select.Option key={l} value={l}>{l}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="cause"
        label="原因"
        rules={[{ required: true, message: '请选择原因' }]}
      >
        <Select placeholder="请选择">
          {causes.map(c => (
            <Select.Option key={c} value={c}>{c}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="description"
        label="描述"
      >
        <TextArea rows={4} placeholder="请输入事件描述..." />
      </Form.Item>

      <Form.Item label="附件">
        {attachments.map((att: any, index: number) => (
          <Space key={index} style={{ display: 'flex', marginBottom: 8 }}>
            <Select
              value={att.type}
              onChange={(val) => {
                attachments[index].type = val;
                handleValuesChange();
              }}
              style={{ width: 100 }}
            >
              <Select.Option value="image">图片</Select.Option>
              <Select.Option value="document">文档</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
            <Input
              placeholder="请输入URL"
              value={att.url}
              onChange={(e) => {
                attachments[index].url = e.target.value;
                handleValuesChange();
              }}
              style={{ flex: 1 }}
            />
            <DeleteOutlined onClick={() => removeAttachment(index)} />
          </Space>
        ))}
        <Button type="dashed" onClick={addAttachment} icon={<PlusOutlined />}>
          添加附件
        </Button>
      </Form.Item>
    </Form>
  );
};

export default IncidentReportForm;