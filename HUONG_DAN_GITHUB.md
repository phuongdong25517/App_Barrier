# 🚀 Hướng dẫn Build APK qua GitHub Actions

## BƯỚC 1 — Tạo Repository trên GitHub

1. Vào **github.com** → đăng nhập
2. Nhấn nút **"+"** góc trên phải → **"New repository"**
3. Điền:
   - Repository name: `barrier-app`
   - Chọn **Public**
   - KHÔNG tick "Add README"
4. Nhấn **"Create repository"**

---

## BƯỚC 2 — Upload code lên GitHub

Mở CMD, chạy từng lệnh:

```
cd Downloads\barrier-app\barrier-app
git init
git add .
git commit -m "Initial commit - BARRIER app"
git branch -M main
git remote add origin https://github.com/TEN_GITHUB_CUA_BAN/barrier-app.git
git push -u origin main
```

> ⚠️ Thay `TEN_GITHUB_CUA_BAN` bằng username GitHub của bạn

---

## BƯỚC 3 — Chờ GitHub Actions build

1. Vào repo trên GitHub → click tab **"Actions"**
2. Thấy workflow **"Build Android APK"** đang chạy (icon vàng ⏳)
3. Chờ khoảng **10-15 phút**
4. Icon chuyển xanh ✅ = build thành công!

---

## BƯỚC 4 — Tải APK

### Cách A — Từ Releases (có link trực tiếp, tạo QR dễ):
1. Click tab **"Releases"** bên phải repo
2. Thấy **"BARRIER App v1"**
3. Click vào `app-release.apk` để tải
4. Copy link tải → vào **qr-code-generator.com** → dán link → tạo QR
5. Quét QR bằng điện thoại → tải và cài

### Cách B — Từ Artifacts:
1. Click tab **"Actions"** → click vào build vừa xong
2. Kéo xuống phần **"Artifacts"**
3. Click **"barrier-app-release"** → tải ZIP → giải nén → lấy APK

---

## BƯỚC 5 — Cài APK lên Android

1. **Bật Unknown Sources:**
   Settings → Security → Install unknown apps → bật cho Chrome/Files

2. **Chuyển APK vào điện thoại:**
   Gửi qua Telegram, Gmail, hoặc Google Drive

3. **Cài đặt:**
   Mở file manager → tìm app-release.apk → nhấn Install

4. **Pair HC-05 trước:**
   Settings → Bluetooth → scan → chọn HC-05 → PIN: 1234

5. **Mở BARRIER app → CONNECT → chọn HC-05** ✅

---

## Mỗi lần cập nhật app:

```
git add .
git commit -m "Update app"
git push
```
GitHub Actions tự động build APK mới!
