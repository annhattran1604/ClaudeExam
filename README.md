# Ôn thi CCA — Hỏi & Đáp (Mobile-First)

Trang web tĩnh tối ưu cho màn hình điện thoại, hiển thị câu hỏi và đáp án đúng cho 4 khóa học CCA:
- **CCAO-F**: Claude Certified Associate - Foundations (193 câu)
- **CCDV-F**: Claude Certified Developer – Foundations (155 câu)
- **CCAR-F**: Claude Certified Architect – Foundations (309 câu)
- **CCAR-P**: Claude Certified Architect (Professional) (160 câu)

## Tính năng
- **Menu chọn khóa học ẩn/hiện**: Gọn ở thanh trên cùng, tự đóng sau khi chọn tab để không chiếm diện tích màn hình.
- **Chỉ hiện câu hỏi & đáp án đúng**: Không hiện các đáp án nhiễu, hỗ trợ câu hỏi nhiều đáp án.
- **Autosearch tức thì**: Thanh tìm kiếm cố định trên cùng, gõ từ khóa hoặc số câu để lọc và highlight trực tiếp câu hỏi + đáp án đúng (hỗ trợ tìm trong tab hiện tại hoặc cả 4 khóa).
- **Dark / Light mode** & nút lên đầu trang.

## Deploy lên GitHub Pages để dùng trên điện thoại

1. Tạo repository mới trên GitHub (ví dụ `ClaudeExam`).
2. Mở terminal tại `E:\VOC\ClaudeExam` và chạy:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: mobile CCA Q&A app"
   git branch -M main
   git remote add origin https://github.com/<username>/ClaudeExam.git
   git push -u origin main
   ```
3. Trên GitHub, vào **Settings → Pages**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)` → bấm **Save**
4. Sau 1–2 phút, mở link `https://<username>.github.io/ClaudeExam/` trên điện thoại (có thể chọn **Thêm vào màn hình chính / Add to Home Screen** để dùng như app).
