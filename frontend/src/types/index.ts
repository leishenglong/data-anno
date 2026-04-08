// 标注类型枚举
export type AnnotationType = 'text_classification' | 'ner' | 'relation_extraction' | 'dialog' | 'score_review';

export interface Project {
  id: number;
  name: string;
  description: string;
  annotation_type: AnnotationType;
  config: ProjectConfig;
  created_at: string;
  updated_at: string;
}

export interface ProjectConfig {
  labels?: LabelConfig[];           // 分类/NER 标签
  score_dimensions?: ScoreDimension[]; // 评分维度
  max_score?: number;          // 最高分
  relation_types?: string[];   // 关系类型
  entity_labels?: LabelConfig[]; // 实体标签（用于关系抽取）
}

export interface LabelConfig {
  name: string;
  color: string;
}

export interface ScoreDimension {
  name: string;
  description?: string;
}

export interface Dataset {
  id: number;
  project_id: number;
  name: string;
  file_name: string;
  total_items: number;
  annotated_items: number;
  status: string;
  created_at: string;
}

export interface DataItem {
  id: number;
  dataset_id: number;
  content: any;
  meta_data: any;
  status: 'pending' | 'annotated' | 'reviewed';
  order_index: number;
}

export interface Annotation {
  id: number;
  item_id: number;
  user_id: number | null;
  annotation_type: string;
  content: any;
  is_ai_generated: boolean;
  review_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// 标注类型配置
export const ANNOTATION_TYPE_CONFIG: Record<AnnotationType, {
  label: string;
  description: string;
  icon: string;
}> = {
  text_classification: {
    label: '文本分类',
    description: '对文本进行分类标注',
    icon: 'TagsOutlined',
  },
  ner: {
    label: '实体识别 (NER)',
    description: '标注文本中的实体',
    icon: 'HighlightOutlined',
  },
  relation_extraction: {
    label: '关系抽取',
    description: '标注实体之间的关系',
    icon: 'ApartmentOutlined',
  },
  dialog: {
    label: '对话标注',
    description: '标注多轮对话质量',
    icon: 'MessageOutlined',
  },
  score_review: {
    label: '评分评审',
    description: '对文本进行多维度评分',
    icon: 'StarOutlined',
  },
};
