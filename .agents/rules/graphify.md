---
trigger: always_on
description: Quy tắc truy vấn và bảo trì Knowledge Graph Codebase bằng Graphify
---

# QUY TẮC GRAPHIFY KNOWLEDGE GRAPH

Knowledge graph của toàn bộ dự án được lưu trữ tại `graphify-out/`:
- `graphify-out/graph.html`: Giao diện trực quan hóa dạng mạng đồ thị (Knowledge Graph Web UI).
- `graphify-out/graph.json`: Dữ liệu đồ thị các thực thể (classes, functions, files, modules) và quan hệ.
- `graphify-out/GRAPH_REPORT.md`: Báo cáo tóm tắt cấu trúc đồ thị và cộng đồng liên kết.

## 1. Khi truy vấn kiến trúc hoặc quan hệ mã nguồn:
- Ưu tiên đọc `graphify-out/GRAPH_REPORT.md` hoặc kiểm tra `graphify-out/graph.json` trước khi tìm kiếm file thủ công.
- Sử dụng lệnh `graphify query "<câu hỏi>"` hoặc `graphify path "<node1>" "<node2>"` khi cần phân tích luồng tương tác giữa các module.

## 2. Sau khi thay đổi mã nguồn lớn hoặc thêm file mới:
- Chạy:
  ```powershell
  graphify . --code-only
  graphify cluster-only .
  ```
- Thao tác này sẽ tự động phân tích lại cây AST và cập nhật lại `graphify-out/graph.html` cùng `GRAPH_REPORT.md`.
