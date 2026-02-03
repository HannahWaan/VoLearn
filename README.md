```markdown
# 📚 VoLearn - Ứng Dụng Học Từ Vựng Tiếng Anh

<p align="center">
  <img src="assets/logo.png" alt="VoLearn Logo" width="120">
</p>

<p align="center">
  <strong>Học từ vựng thông minh với nhiều phương pháp luyện tập</strong>
</p>

<p align="center">
  <a href="#tính-năng-nổi-bật">Tính năng</a> •
  <a href="#cài-đặt">Cài đặt</a> •
  <a href="#hướng-dẫn-sử-dụng">Hướng dẫn</a> •
  <a href="#cấu-trúc-dự-án">Cấu trúc</a> •
  <a href="#đóng-góp">Đóng góp</a>
</p>

---

## 🌟 Giới Thiệu

**VoLearn** là ứng dụng học từ vựng tiếng Anh toàn diện được thiết kế cho người Việt. Ứng dụng kết hợp nhiều phương pháp học tập khoa học bao gồm Flashcard, Trắc nghiệm, Nghe-Viết (Dictation), và Gõ từ, cùng với tính năng đọc tin tức tiếng Anh tích hợp và tra từ điển nhanh.

### Tại sao chọn VoLearn?

- **🎯 Đa dạng phương pháp học**: 4 chế độ luyện tập khác nhau phù hợp với mọi phong cách học
- **🧠 Spaced Repetition System (SRS)**: Thuật toán ôn tập thông minh giúp ghi nhớ lâu dài
- **📰 Học qua tin tức thật**: Đọc báo tiếng Anh với tính năng tra từ tích hợp
- **📱 Offline-first**: Hoạt động hoàn toàn offline, dữ liệu lưu trên thiết bị
- **🌙 Dark Mode**: Hỗ trợ chế độ tối bảo vệ mắt
- **🔄 Multi-meaning**: Hỗ trợ từ có nhiều nghĩa với đầy đủ thông tin

---

## ✨ Tính Năng Nổi Bật

### 📊 Dashboard Thông Minh
- Theo dõi tiến độ học tập với biểu đồ trực quan
- Thống kê điểm số, tỷ lệ chính xác, thời gian học
- Phân tích phân bố từ vựng theo mức độ thành thạo

### 🎴 4 Chế Độ Luyện Tập

| Chế độ | Mô tả | Đặc điểm |
|--------|-------|----------|
| **Flashcard** | Lật thẻ học từ | Hiển thị tất cả nghĩa, auto-play, 4 mức đánh giá |
| **Trắc nghiệm** | Chọn đáp án đúng | Random nghĩa, timer, auto-next |
| **Nghe-Viết** | Nghe và viết lại | Điều chỉnh tốc độ, nhiều chế độ chấm điểm |
| **Gõ từ** | Nhìn nghĩa, gõ từ | Gợi ý chữ đầu, kiểm tra chính tả |

### 📰 News Reader
- Đọc tin tức từ The Guardian
- Double-click tra từ điển ngay lập tức
- Thêm từ mới vào thư viện chỉ với 1 click

### 📚 Quản Lý Từ Vựng
- Tạo và quản lý nhiều bộ từ vựng
- Hỗ trợ từ có nhiều nghĩa (multi-meaning)
- Import/Export dữ liệu JSON/CSV
- Đồng bộ Google Drive

---

## 🚀 Cài Đặt

### Yêu cầu
- Trình duyệt web hiện đại (Chrome, Firefox, Safari, Edge)
- Không cần cài đặt thêm phần mềm

### Cách 1: Sử dụng trực tiếp
Truy cập: **[https://hannahwaan.github.io/VoLearn](https://hannahwaan.github.io/VoLearn)**

### Cách 2: Chạy local

```bash
# Clone repository
git clone https://github.com/HannahWaan/VoLearn.git
cd VoLearn

# Mở với Live Server (VS Code) hoặc
npx serve .

# Hoặc dùng Python
python -m http.server 8000
```

### Cách 3: Deploy Cloudflare Worker (cho News)

```bash
cd worker-news

# Cài đặt Wrangler CLI
npm install -g wrangler

# Đăng nhập Cloudflare
wrangler login

# Thiết lập API key
wrangler secret put GUARDIAN_API_KEY

# Deploy
wrangler deploy
```

---

## 📖 Hướng Dẫn Sử Dụng

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

## 🗂️ Cấu Trúc Dự Án

```
VoLearn/
├── 📄 index.html                 # Entry point
├── 📁 css/
│   ├── main.css                  # CSS chính, variables, base styles
│   ├── 📁 components/
│   │   ├── flashcard.css         # Styles cho flashcard
│   │   ├── dictation.css         # Styles cho dictation
│   │   ├── modal.css             # Styles cho modals
│   │   └── ...
│   └── 📁 sections/
│       ├── home.css              # Dashboard styles
│       ├── practice.css          # Practice section
│       ├── bookshelf.css         # Library styles
│       ├── add-word.css          # Add word form
│       ├── calendar.css          # Calendar styles
│       ├── news.css              # News reader
│       └── settings.css          # Settings page
├── 📁 js/
│   ├── app.js                    # App initialization
│   ├── 📁 core/
│   │   ├── state.js              # Global state management
│   │   ├── storage.js            # LocalStorage operations
│   │   └── router.js             # Tab navigation
│   ├── 📁 ui/
│   │   ├── home.js               # Dashboard logic & charts
│   │   ├── bookshelf.js          # Library management
│   │   ├── addWord.js            # Add word form logic
│   │   ├── calendar.js           # Calendar rendering
│   │   ├── news.js               # News feed & article
│   │   ├── settings.js           # Settings handlers
│   │   ├── wordLookup.js         # Double-click translate
│   │   └── toast.js              # Toast notifications
│   ├── 📁 practice/
│   │   ├── practiceEngine.js     # Core practice logic
│   │   ├── flashcard.js          # Flashcard mode
│   │   ├── flashcardSettings.js  # Flashcard settings UI
│   │   ├── quiz.js               # Quiz mode
│   │   ├── quizSettings.js       # Quiz settings UI
│   │   ├── dictation.js          # Dictation mode
│   │   ├── dictationSettings.js  # Dictation settings UI
│   │   ├── typing.js             # Typing mode
│   │   ├── typingSettings.js     # Typing settings UI
│   │   ├── srsEngine.js          # SRS algorithm
│   │   └── weakReviewSettings.js # Weak review settings
│   ├── 📁 data/
│   │   ├── wordNormalizer.js     # Text normalization
│   │   ├── wordPipeline.js       # Data processing
│   │   └── ...
│   └── 📁 utils/
│       └── speech.js             # Text-to-speech
├── 📁 templates/
│   └── 📁 sections/
│       ├── home.html
│       ├── practice.html
│       ├── bookshelf.html
│       ├── add-word.html
│       ├── calendar.html
│       ├── news.html
│       └── settings.html
├── 📁 worker-news/               # Cloudflare Worker cho News
│   ├── wrangler.toml
│   └── 📁 src/
│       └── index.js              # Worker logic
└── 📁 assets/
    └── logo.png
```

---

## 📊 Data Schema

### Word Object

```javascript
{
  id: "uuid-string",
  word: "table",
  wordFormation: "noun → verb",
  setId: "set-uuid",
  meanings: [
    {
      phoneticUS: "/ˈteɪ.bəl/",
      phoneticUK: "/ˈteɪ.bəl/",
      pos: "noun",
      defEn: "a piece of furniture with a flat top",
      defVi: "cái bàn",
      example: "The table is made of wood.",
      synonyms: ["desk", "counter"],
      antonyms: []
    },
    {
      phoneticUS: "/ˈteɪ.bəl/",
      phoneticUK: "/ˈteɪ.bəl/",
      pos: "verb",
      defEn: "to present something formally for discussion",
      defVi: "trình bày, đề xuất",
      example: "He tabled a motion at the meeting.",
      synonyms: ["propose", "submit", "present"],
      antonyms: ["withdraw"]
    }
  ],
  createdAt: "2026-02-03T10:00:00.000Z",
  updatedAt: "2026-02-03T10:00:00.000Z",
  mastered: false,
  bookmarked: false,
  srsLevel: 0,
  nextReview: null,
  reviewCount: 0,
  correctCount: 0,
  streak: 0,
  lastReviewed: null
}
```

### Set Object

```javascript
{
  id: "set-uuid",
  name: "IELTS Vocabulary",
  icon: "book",
  color: "#6366f1",
  createdAt: "2026-02-01T00:00:00.000Z"
}
```

### Practice History Entry

```javascript
{
  type: "practice",
  mode: "quiz",           // flashcard | quiz | dictation | typing
  timestamp: 1706950800000,
  duration: 300,          // seconds
  total: 20,
  correct: 18,
  wrong: 2,
  skipped: 0,
  accuracy: 90,
  wrongWordIds: ["word-1", "word-2"],
  answers: [...]
}
```

---

## 🔧 API Endpoints

### Cloudflare Worker - News Proxy

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/guardian/feed` | GET | Lấy danh sách tin tức |
| `/guardian/feed?section=world` | GET | Lọc theo danh mục |
| `/guardian/item?id=[article-path]` | GET | Lấy chi tiết bài viết |

**Response `/guardian/item`:**
```json
{
  "id": "world/2026/feb/03/article-slug",
  "title": "Article Title",
  "section": "World news",
  "date": "2026-02-03T10:00:00Z",
  "contentHtml": "<p>Full article HTML...</p>",
  "images": [
    {
      "src": "https://...",
      "alt": "Image description",
      "caption": "Photo caption"
    }
  ],
  "author": "Author Name"
}
```

### Free Dictionary API (Word Lookup)

```
GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

---

## 🎨 Theming

VoLearn sử dụng CSS Variables cho theming:

```css
:root {
  /* Colors */
  --primary-color: #6366f1;
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  
  /* Border Radius */
  --border-radius-sm: 6px;
  --border-radius-md: 12px;
  --border-radius-lg: 16px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: #334155;
}
```

---

## 🤝 Đóng Góp

Chúng tôi hoan nghênh mọi đóng góp! 

### Cách đóng góp

1. **Fork** repository
2. Tạo branch mới:
   ```bash
   git checkout -b feature/ten-tinh-nang
   ```
3. Commit changes:
   ```bash
   git commit -m "Add: Mô tả tính năng mới"
   ```
4. Push branch:
   ```bash
   git push origin feature/ten-tinh-nang
   ```
5. Tạo **Pull Request**

### Quy ước commit message

- `Add:` - Thêm tính năng mới
- `Fix:` - Sửa lỗi
- `Update:` - Cập nhật tính năng có sẵn
- `Remove:` - Xóa code/tính năng
- `Refactor:` - Tái cấu trúc code
- `Docs:` - Cập nhật documentation

### Báo lỗi

Tạo [Issue](https://github.com/HannahWaan/VoLearn/issues) với thông tin:
- Mô tả lỗi chi tiết
- Các bước tái hiện
- Screenshots (nếu có)
- Trình duyệt và phiên bản

---

## 📝 Changelog

### v2.1.0 (Current)
- ✨ **Multi-meaning support**: Hỗ trợ từ có nhiều nghĩa
- ✨ **Random meaning**: Quiz/Typing/Dictation random nghĩa mỗi câu
- ✨ **Speed slider**: Điều chỉnh tốc độ đọc trong Dictation
- ✨ **Show answer**: Hiện đáp án khi sai/bỏ qua
- 🐛 Fix flashcard scroll overflow
- 🐛 Fix dictation skip behavior

### v2.0.0
- ✨ News Reader tích hợp với The Guardian
- ✨ Word Lookup (double-click translate)
- ✨ Thêm từ từ tin tức vào thư viện
- 🎨 UI/UX improvements

### v1.0.0
- 🎉 Initial release
- 4 chế độ luyện tập
- Quản lý từ vựng
- SRS system
- Dark mode

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
