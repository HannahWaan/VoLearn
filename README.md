# 📚 VoLearn - Web Học Từ Vựng Tiếng Anh

## 🌟 Giới Thiệu

**VoLearn** là web học từ vựng tiếng Anh toàn diện được thiết kế cho người Việt. Ứng dụng kết hợp nhiều phương pháp học tập khoa học bao gồm Flashcard, Trắc nghiệm, Nghe-Viết (Dictation), và Gõ từ, cùng với tính năng đọc tin tức tiếng Anh tích hợp và tra từ điển nhanh.

### Tại sao chọn VoLearn?

- **🎯 Đa dạng phương pháp học**: 4 chế độ luyện tập khác nhau phù hợp với mọi phong cách học
- **🧠 Spaced Repetition System (SRS)**: Thuật toán ôn tập thông minh giúp ghi nhớ lâu dài
- **📰 Học qua tin tức thật**: Đọc báo tiếng Anh với tính năng tra từ tích hợp
- **📱 Offline-first**: Hoạt động hoàn toàn offline, dữ liệu lưu trên thiết bị
- **🌙 Dark Mode**: Hỗ trợ chế độ tối bảo vệ mắt
- **🔄 Multi-meaning**: Hỗ trợ từ có nhiều nghĩa với đầy đủ thông tin

---

## ✨ Tính Năng Nổi Bật

### Tab Home - Trang Chủ
Dashboard hiển thị tổng quan về tiến độ học tập của bạn.

**Các chỉ số chính:**
- **Điểm trung bình**: Điểm TB từ các phiên luyện tập gần đây
- **Tỷ lệ thành thạo**: Phần trăm từ đã master so với tổng số từ
- **Thời gian/từ**: Thời gian trung bình để master 1 từ
- **Tổng từ vựng**: Số từ trong thư viện của bạn

**Biểu đồ:**
- Score Gauge: Điểm số tổng thể (0-10)
- Accuracy Donut: Tỷ lệ chính xác
- Performance Radar: Đánh giá 5 khía cạnh
- Time Series: Thời gian học theo ngày/tuần/tháng
- Vocab Distribution: Phân bố từ theo mức độ

---

### Tab Practice - Luyện Tập

#### 🔄 Ôn Từ Yếu (SRS Review)
Hệ thống tự động xác định từ cần ôn dựa trên:
- Tỷ lệ đúng dưới 70%
- Thời gian kể từ lần ôn cuối
- Số lần sai liên tiếp

#### 🎴 Flashcard
1. Click **"Bắt đầu"** trong ô Flashcard
2. Chọn phạm vi từ và cài đặt
3. Lật thẻ để xem nghĩa
4. Đánh giá: **Quên** | **Khó** | **Nhớ** | **Dễ**

**Cài đặt:**
- Shuffle: Xáo trộn thứ tự từ
- Auto-play: Tự động lật và chuyển
- Speak on show/flip: Phát âm tự động
- Front/Back fields: Chọn thông tin hiển thị

#### ❓ Trắc Nghiệm
1. Click **"Bắt đầu"** trong ô Trắc nghiệm
2. Chọn phạm vi và cài đặt
3. Chọn đáp án đúng trong 4 lựa chọn
4. Xem kết quả và ôn từ sai

**Cài đặt:**
- Số đáp án: 2-6 đáp án
- Time limit: Giới hạn thời gian mỗi câu
- Auto-next: Tự động sang câu tiếp
- Question/Answer fields: Chọn loại câu hỏi và đáp án

#### 🎧 Nghe - Viết (Dictation)
1. Click **"Bắt đầu"** trong ô Nghe-Viết
2. Nghe từ/cụm từ được phát
3. Gõ lại chính xác những gì nghe được
4. Điều chỉnh tốc độ nếu cần (0.5x - 1.5x)

**Chế độ chấm điểm:**
| Mode | Mô tả |
|------|-------|
| Exact | Phải đúng 100% |
| Half | Đúng ≥50% được tính |
| Partial | Điểm theo phần trăm đúng |
| Lenient | Bỏ qua lỗi nhỏ (dấu, viết hoa) |

#### ⌨️ Gõ Từ
1. Click **"Bắt đầu"** trong ô Gõ từ
2. Xem gợi ý (nghĩa, ví dụ, ...)
3. Gõ từ tiếng Anh tương ứng
4. Kiểm tra và xem đáp án nếu sai

**Gợi ý:**
- Chữ cái đầu tiên
- Độ dài từ
- Các field khác (ví dụ, loại từ, ...)

---

### Tab Bookshelf - Thư Viện

Quản lý bộ từ vựng của bạn.

**Chức năng:**
- **Tạo bộ từ mới**: Click nút "+" hoặc "Tạo bộ từ mới"
- **Sửa bộ từ**: Click vào bộ từ → Edit
- **Xóa bộ từ**: Click vào bộ từ → Delete
- **Tìm kiếm**: Gõ tên bộ từ vào ô tìm kiếm
- **Xem tất cả**: Click "Tất cả từ vựng" để xem toàn bộ

---

### Tab Add Word - Thêm Từ
Thêm từ vựng mới với đầy đủ thông tin.

**Các trường:**

| Trường | Mô tả | Bắt buộc |
|--------|-------|:--------:|
| Từ vựng | Từ tiếng Anh | ✓ |
| Word Formation | Cách hình thành từ (prefix, suffix, ...) | |
| Bộ từ vựng | Chọn set chứa từ | |

**Mỗi nghĩa bao gồm:**
- Phát âm US/UK (IPA)
- Loại từ (noun, verb, adj, ...)
- Định nghĩa tiếng Anh
- Nghĩa tiếng Việt
- Câu ví dụ
- Từ đồng nghĩa
- Từ trái nghĩa

**Thêm nhiều nghĩa:**
Click **"+ Thêm nghĩa"** để thêm block nghĩa mới (ví dụ: từ "table" vừa là danh từ "cái bàn", vừa là động từ "trình bày").

---

### Tab Calendar - Lịch Học
Theo dõi hoạt động học tập hàng ngày.

**Hiển thị:**
- Số từ đã thêm hôm nay
- Số từ đã ôn hôm nay
- Lịch tháng với đánh dấu ngày có hoạt động

---

### Tab News - Tin Tức
Đọc tin tiếng Anh và học từ mới.

**Cách sử dụng:**
1. Chọn danh mục tin (World, Business, Technology, ...)
2. Click vào bài viết để đọc
3. **Double-click** vào bất kỳ từ nào để tra nghĩa
4. Click **"Thêm vào từ điển"** để lưu từ

**Popup tra từ hiển thị:**
- Từ và phát âm
- Loại từ
- Định nghĩa tiếng Anh
- Nút phát âm
- Nút thêm vào từ điển

---

### Tab Settings - Cài Đặt

**Giao diện:**
- Dark/Light mode toggle
- Chọn font chữ (Be Vietnam Pro, Roboto, Open Sans, Nunito, Inter)

**Giọng đọc:**
- Chọn giọng US/UK/VI
- Điều chỉnh tốc độ (0.5x - 2x)
- Nút test giọng đọc

**Quản lý dữ liệu:**
- Export JSON: Sao lưu toàn bộ dữ liệu
- Export CSV: Xuất danh sách từ
- Import: Nhập dữ liệu từ file
- Clear Data: Xóa tất cả (cẩn thận!)

**Google Drive:**
- Đăng nhập tài khoản Google
- Sao lưu lên Drive
- Khôi phục từ Drive
- Xem thời gian sync cuối

---

## 🤝 Đóng Góp
Chúng tôi hoan nghênh mọi đóng góp! 

---

## 📄 License

MIT License

```
Copyright (c) 2026 VoLearn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Credits

- [Chart.js](https://www.chartjs.org/) - Biểu đồ
- [Font Awesome](https://fontawesome.com/) - Icons
- [The Guardian API](https://open-platform.theguardian.com/) - News content
- [Free Dictionary API](https://dictionaryapi.dev/) - Word definitions

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/HannahWaan">HannahWaan</a>
</p>

<p align="center">
  <strong>VoLearn - Học từ vựng thông minh</strong> 🎓
</p>
