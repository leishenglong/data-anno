"""初始化测试数据脚本 - 创建5种标注类型的项目并上传测试数据"""
import urllib.request
import urllib.parse
import json
import os
import sys
import mimetypes
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
import io

API_BASE = "http://localhost:8000/api"


def api_get(path, params=None):
    url = f"{API_BASE}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def api_post_json(path, data):
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        path if path.startswith("http") else f"{API_BASE}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def api_post_multipart(path, fields, files):
    """POST multipart/form-data"""
    import uuid
    boundary = uuid.uuid4().hex
    buf = io.BytesIO()

    # 添加普通字段
    for key, value in fields.items():
        buf.write(f"--{boundary}\r\n".encode())
        buf.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
        buf.write(value.encode("utf-8"))
        buf.write(b"\r\n")

    # 添加文件
    for key, (filename, filedata, content_type) in files.items():
        buf.write(f"--{boundary}\r\n".encode())
        buf.write(
            f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode()
        )
        buf.write(f"Content-Type: {content_type}\r\n\r\n".encode())
        buf.write(filedata)
        buf.write(b"\r\n")

    buf.write(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        path if path.startswith("http") else f"{API_BASE}{path}",
        data=buf.getvalue(),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))
TEST_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test-data")

# 定义5种标注类型的项目配置
PROJECTS = [
    {
        "name": "文本分类测试",
        "description": "文本分类标注测试项目 - 科技/体育/财经/娱乐/健康/教育",
        "annotation_type": "text_classification",
        "config": {
            "labels": [
                {"name": "科技", "color": "#1890ff"},
                {"name": "体育", "color": "#52c41a"},
                {"name": "财经", "color": "#faad14"},
                {"name": "娱乐", "color": "#722ed1"},
                {"name": "健康", "color": "#13c2c2"},
                {"name": "教育", "color": "#eb2f96"},
            ]
        },
        "data_file": "text_classification.json",
    },
    {
        "name": "命名实体识别测试",
        "description": "NER标注测试项目 - 人名/地名/机构名/时间",
        "annotation_type": "ner",
        "config": {
            "labels": [
                {"name": "人名", "color": "#f5222d"},
                {"name": "地名", "color": "#1890ff"},
                {"name": "机构名", "color": "#52c41a"},
                {"name": "时间", "color": "#faad14"},
            ]
        },
        "data_file": "ner.json",
    },
    {
        "name": "关系抽取测试",
        "description": "关系抽取标注测试项目 - 人物-机构-地点关系",
        "annotation_type": "relation_extraction",
        "config": {
            "entity_labels": [
                {"name": "人名", "color": "#f5222d"},
                {"name": "机构", "color": "#1890ff"},
                {"name": "地点", "color": "#52c41a"},
            ],
            "relation_types": ["创立", "位于", "担任", "属于"],
        },
        "data_file": "relation_extraction.json",
    },
    {
        "name": "对话标注测试",
        "description": "多轮对话标注测试项目 - 对话质量评分和偏好选择",
        "annotation_type": "dialog",
        "config": {
            "max_score": 5,
        },
        "data_file": "dialog.json",
    },
    {
        "name": "评分审核测试",
        "description": "多维度评分审核测试项目",
        "annotation_type": "score_review",
        "config": {
            "max_score": 5,
            "score_dimensions": [
                {"name": "准确性", "description": "内容是否准确无误"},
                {"name": "完整性", "description": "内容是否完整，是否涵盖关键信息"},
                {"name": "可读性", "description": "文字表达是否清晰流畅"},
                {"name": "专业性", "description": "是否使用了专业术语，深度如何"},
            ],
        },
        "data_file": "score_review.json",
    },
]


def main():
    print("=" * 60)
    print("  数据标注系统 - 测试数据初始化")
    print("=" * 60)

    # 1. 检查已有项目
    print("\n[1] 检查现有项目...")
    try:
        existing = api_get("/projects", {"skip": 0, "limit": 100})
        if existing:
            print(f"    已有 {len(existing)} 个项目")
        else:
            print("    暂无项目")
    except Exception as e:
        print(f"    获取项目列表失败: {e}")
        sys.exit(1)

    # 2. 检查哪些项目缺少数据集，只上传缺失的
    print("\n[2] 检查项目数据集...")
    projects_needing_data = []
    for proj_config in PROJECTS:
        # 查找匹配的已有项目
        matching = [p for p in existing if p["name"] == proj_config["name"] and p["annotation_type"] == proj_config["annotation_type"]]
        if matching:
            proj = matching[0]
            # 检查是否已有数据集
            try:
                datasets = api_get(f"/projects/{proj['id']}/datasets")
                if datasets:
                    print(f"    [skip] {proj['name']}: 已有 {len(datasets)} 个数据集")
                    continue
            except:
                pass
            # 需要上传数据
            projects_needing_data.append({**proj_config, "id": proj["id"]})
        else:
            # 需要创建项目并上传数据
            print(f"    [new] {proj_config['name']}: 需要创建")
            projects_needing_data.append(proj_config)

    # 3. 创建缺少的项目
    created_projects = []
    print("\n[3] 创建缺失的项目...")
    for proj in projects_needing_data:
        if "id" not in proj:
            try:
                data = api_post_json("/projects", {
                    "name": proj["name"],
                    "description": proj["description"],
                    "annotation_type": proj["annotation_type"],
                    "config": proj["config"],
                })
                proj = {**proj, "id": data["id"]}
                print(f"    [OK] {proj['name']} (ID: {data['id']})")
            except Exception as e:
                print(f"    [FAIL] {proj['name']}: {e}")
                continue
        created_projects.append(proj)

    # 4. 上传测试数据
    print("\n[4] 上传测试数据...")
    for proj in created_projects:
        data_file = os.path.join(TEST_DATA_DIR, proj["data_file"])
        if not os.path.exists(data_file):
            print(f"    [FAIL] {proj['name']}: file not found {proj['data_file']}")
            continue

        try:
            with open(data_file, "rb") as f:
                file_data = f.read()
            result = api_post_multipart(
                f"/projects/{proj['id']}/datasets",
                fields={"name": f"{proj['name']}数据集"},
                files={"file": (proj["data_file"], file_data, "application/json")},
            )
            print(f"    [OK] {proj['name']}: {result['total_items']} items (dataset ID: {result['id']})")
        except Exception as e:
            print(f"    [FAIL] {proj['name']}: {e}")

    # 5. 验证所有项目
    print("\n[5] 验证所有项目数据...")
    all_projects = api_get("/projects", {"skip": 0, "limit": 100})
    for proj in all_projects:
        try:
            datasets = api_get(f"/projects/{proj['id']}/datasets")
            if datasets:
                ds = datasets[0]
                print(f"    [OK] {proj['name']} ({proj['annotation_type']}): {ds['total_items']} items, {ds['annotated_items']} annotated")
            else:
                print(f"    [WARN] {proj['name']}: no datasets")
        except Exception as e:
            print(f"    [FAIL] {proj['name']}: {e}")

    # 6. 输出访问链接
    print("\n" + "=" * 60)
    print("  Test data initialization complete!")
    print("=" * 60)
    print("\nPages to visit:")
    print(f"  Dashboard:    http://localhost:5173/")
    print(f"  Projects:     http://localhost:5173/projects")
    for proj in all_projects:
        try:
            datasets = api_get(f"/projects/{proj['id']}/datasets")
            if datasets:
                ds = datasets[0]
                print(f"  {proj['name']} ({proj['annotation_type']}):")
                print(f"    Detail:      http://localhost:5173/projects/{proj['id']}")
                print(f"    Annotation:  http://localhost:5173/annotation/{ds['id']}")
                print(f"    Review:      http://localhost:5173/review/{ds['id']}")
        except:
            pass
    print(f"\n  AI Config:    http://localhost:5173/ai-config")
    print()


if __name__ == "__main__":
    main()
