import React, { useState } from 'react';
import { Upload, Modal, Form, Input, Button, message, Progress } from 'antd';
import { InboxOutlined, CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { datasetApi } from '@/services/api';

const { Dragger } = Upload;

interface DataUploaderProps {
  projectId: number;
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const DataUploader: React.FC<DataUploaderProps> = ({
  projectId,
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    const values = await form.validateFields();
    const file = fileList[0].originFileObj;
    
    if (!file) {
      message.error('文件无效');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // 模拟进度
    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      await datasetApi.uploadDataset(projectId, file, values.name);
      
      clearInterval(progressTimer);
      setUploadProgress(100);
      
      message.success('数据集上传成功 🎉');
      setFileList([]);
      form.resetFields();
      
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (error) {
      clearInterval(progressTimer);
      message.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const beforeUpload = (file: File) => {
    const validTypes = ['.json', '.jsonl', '.csv'];
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(fileExt)) {
      message.error('只支持 JSON、JSONL、CSV 格式的文件');
      return Upload.LIST_IGNORE;
    }

    // 检查文件大小 (限制 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error('文件大小不能超过 50MB');
      return Upload.LIST_IGNORE;
    }

    const defaultName = file.name.replace(/\.[^/.]+$/, '');
    form.setFieldsValue({ name: defaultName });

    return false;
  };

  const handleChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList.slice(-1));
  };

  const handleCancel = () => {
    setFileList([]);
    form.resetFields();
    setUploadProgress(0);
    onCancel();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'json':
        return '📄';
      case 'jsonl':
        return '📝';
      case 'csv':
        return '📊';
      default:
        return '📁';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10,
          padding: '8px 0',
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <UploadOutlined style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>上传数据集</div>
            <div style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>支持 JSON、JSONL、CSV 格式</div>
          </div>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={520}
      centered
      bodyStyle={{ padding: 24 }}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 8 }}
      >
        <Form.Item
          name="name"
          label={<span style={{ fontWeight: 500 }}>数据集名称</span>}
          rules={[{ required: true, message: '请输入数据集名称' }]}
        >
          <Input 
            placeholder="请输入数据集名称" 
            size="large"
            style={{ borderRadius: 10 }}
          />
        </Form.Item>

        <Form.Item label={<span style={{ fontWeight: 500 }}>数据文件</span>}>
          {!fileList.length ? (
            <Dragger
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              multiple={false}
              accept=".json,.jsonl,.csv"
              showUploadList={false}
            >
              <div style={{
                padding: '40px 20px',
                background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%)',
                borderRadius: 16,
                border: '2px dashed #91caff',
                transition: 'all 0.3s',
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 24px rgba(24, 144, 255, 0.3)',
                }}>
                  <InboxOutlined style={{ fontSize: 28, color: '#fff' }} />
                </div>
                <p style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: '#333',
                  margin: '0 0 8px 0',
                }}>
                  点击或拖拽文件到此处上传
                </p>
                <p style={{ 
                  fontSize: 13, 
                  color: '#999',
                  margin: 0,
                }}>
                  支持 JSON、JSONL、CSV 格式，单个文件不超过 50MB
                </p>
              </div>
            </Dragger>
          ) : (
            <div style={{
              padding: 20,
              background: '#fafafa',
              borderRadius: 16,
              border: '1px solid #e8e8e8',
            }}>
              {/* 文件信息卡片 */}
              <div style={{
                padding: 16,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e8e8e8',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #52c41a 0%, #13c2c2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {getFileIcon(fileList[0].name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 600, 
                      color: '#333',
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {fileList[0].name}
                    </div>
                    <div style={{ 
                      fontSize: 12, 
                      color: '#999',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <span>{formatFileSize(fileList[0].size || 0)}</span>
                      <span>•</span>
                      <span style={{ color: '#52c41a' }}>准备就绪</span>
                    </div>
                  </div>
                  {!uploading && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={() => setFileList([])}
                      style={{ borderRadius: 8 }}
                    >
                      移除
                    </Button>
                  )}
                </div>
              </div>

              {/* 上传进度 */}
              {uploading && (
                <div style={{
                  padding: 16,
                  background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
                  borderRadius: 12,
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#1890ff', fontWeight: 500 }}>
                      正在上传...
                    </span>
                    <span style={{ fontSize: 13, color: '#1890ff', fontWeight: 600 }}>
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <Progress 
                    percent={uploadProgress} 
                    status="active"
                    showInfo={false}
                    strokeColor={{
                      '0%': '#1890ff',
                      '100%': '#722ed1',
                    }}
                    trailColor="#fff"
                  />
                </div>
              )}

              {/* 上传成功提示 */}
              {uploadProgress === 100 && !uploading && (
                <div style={{
                  padding: 16,
                  background: 'linear-gradient(135deg, #f6ffed 0%, #e6fffb 100%)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                  <span style={{ color: '#52c41a', fontWeight: 500 }}>上传成功！</span>
                </div>
              )}
            </div>
          )}
        </Form.Item>

        {/* 文件格式说明 */}
        <div style={{
          padding: 16,
          background: '#f9f9f9',
          borderRadius: 12,
          marginTop: 16,
        }}>
          <div style={{ fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 12 }}>
            📋 支持的文件格式说明
          </div>
          <div style={{ fontSize: 12, color: '#999', lineHeight: 1.8 }}>
            <div><strong style={{ color: '#666' }}>JSON:</strong> 标准 JSON 数组格式</div>
            <div><strong style={{ color: '#666' }}>JSONL:</strong> 每行一个 JSON 对象</div>
            <div><strong style={{ color: '#666' }}>CSV:</strong> 逗号分隔的表格数据</div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 12,
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid #f0f0f0',
        }}>
          <Button 
            onClick={handleCancel}
            size="large"
            style={{ borderRadius: 10 }}
          >
            取消
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<UploadOutlined />}
            loading={uploading}
            onClick={handleUpload}
            disabled={fileList.length === 0}
            style={{ 
              borderRadius: 10,
              background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
            }}
          >
            {uploading ? '上传中...' : '开始上传'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default DataUploader;
