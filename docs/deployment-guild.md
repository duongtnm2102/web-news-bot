# 🚀 Hướng dẫn Triển khai E-con News Terminal v2.024

Tài liệu này cung cấp hướng dẫn chi tiết để triển khai ứng dụng E-con News Terminal lên nền tảng Render.com, tối ưu cho gói miễn phí (512MB RAM).

## 1. Yêu cầu Tiên quyết

- Tài khoản [GitHub](https://github.com/).
- Tài khoản [Render](https://render.com/).
- [API Key cho Gemini AI](https://aistudio.google.com/).

## 2. Phương thức Triển khai

Bạn có thể chọn một trong hai cách sau để triển khai.

### a. Triển khai bằng một cú nhấp (One-Click Deploy)

Đây là cách nhanh nhất để khởi chạy ứng dụng.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/duongtnm2102/web-news-bot)

Render sẽ tự động sao chép repo, thiết lập dịch vụ và cấu hình các biến môi trường cần thiết.

### b. Triển khai Thủ công (Manual Setup)

Cách này cho phép bạn tùy chỉnh nhiều hơn.

1.  **Fork và Clone Repo:**
    ```bash
    # Fork repo duongtnm2102/web-news-bot về tài khoản GitHub của bạn
    git clone [https://github.com/](https://github.com/)<your-username>/web-news-bot.git
    cd web-news-bot
    ```

2.  **Tạo Dịch vụ Web trên Render:**
    * Trên Dashboard của Render, chọn **New > Web Service**.
    * Kết nối với tài khoản GitHub của bạn và chọn repo vừa fork.
    * Đặt tên cho dịch vụ, ví dụ: `e-con-news-terminal`.

3.  **Cấu hình Dịch vụ:**
    * **Region**: `Singapore` (Gần Việt Nam nhất để giảm độ trễ).
    * **Branch**: `main`.
    * **Runtime**: `Python 3`.
    * **Build Command**: `pip install -r requirements.txt`.
    * **Start Command**: `gunicorn app:app --preload --workers 1 --timeout 120`.
    * **Instance Type**: `Free`.

4.  **Cấu hình Biến Môi trường:**
    * Vào tab **Environment** của dịch vụ trên Render.
    * Thêm các biến sau:
        * `GEMINI_API_KEY`: Dán API Key của bạn từ Google AI Studio. **QUAN TRỌNG:** Giữ bí mật key này.
        * `SECRET_KEY`: Render có thể tự động tạo một chuỗi ngẫu nhiên cho bạn.
        * `FLASK_ENV`: `production`.
        * `PYTHON_VERSION`: `3.11.0` (để khớp với `runtime.txt`).

5.  **Triển khai:**
    * Lưu các thay đổi và nhấn **Create Web Service**. Render sẽ bắt đầu quá trình build và triển khai.

## 3. Tối ưu cho Render.com (Gói 512MB RAM)

Repo này đã được tối ưu sẵn để hoạt động hiệu quả trên gói miễn phí của Render.

* **Tệp `requirements.txt` gọn nhẹ:** Chỉ bao gồm các thư viện cần thiết, loại bỏ các gói nặng và các dependency không quan trọng để giữ mức sử dụng RAM trong khoảng 280-450MB.
* **Cấu hình Gunicorn:** Lệnh `startCommand` sử dụng `--workers 1` để tiết kiệm bộ nhớ và `--preload` để khởi động nhanh hơn.
* **Quản lý bộ nhớ:** `config/memory-optimizer.py` và `utils/cache-manager.py` được thiết kế để tự động dọn dẹp bộ nhớ đệm và giải phóng tài nguyên khi bộ nhớ gần đầy, đặc biệt quan trọng cho môi trường 512MB RAM.

## 4. Cấu trúc `render.yaml`

Bạn cũng có thể thêm tệp `render.yaml` vào gốc của repo để tự động hóa cấu hình dịch vụ (Infrastructure as Code).

```yaml
# render.yaml
services:
  - type: web
    name: e-con-news-terminal
    env: python
    region: singapore # Gần Việt Nam nhất
    plan: starter      # Gói miễn phí
    branch: main
    buildCommand: |
      pip install --upgrade pip
      pip install -r requirements.txt
    startCommand: gunicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --timeout 120 --preload
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: FLASK_ENV
        value: production
      - key: GEMINI_API_KEY
        sync: false # Giữ bí mật, không đồng bộ từ repo
      - key: SECRET_KEY
        generateValue: true # Tự động tạo giá trị ngẫu nhiên
