import type { ChangelogEntry } from '@tada/kit/brand'

/** Newest first. The first entry is the version shown in the header: add a new one on every release. */
export const changelog: ChangelogEntry[] = [
  {
    version: '1.3.2',
    date: '2026-10-04',
    changes: [
      { kind: 'changed', text: { en: 'New logo mark (icon and short name on a tinted tile), the same in every app, and the shared page layout', vi: 'Logo mới (icon và tên gọn trên nền xanh), giống mọi app, và khung giao diện dùng chung' } },
      { kind: 'changed', text: { en: 'New home-screen icon; the installed app is named DaFinance', vi: 'Icon màn hình chính mới; app cài đặt có tên DaFinance' } },
      { kind: 'changed', text: { en: 'Appearance picker from the shared kit (@tada/kit v0.3.0)', vi: 'Bộ chọn giao diện dùng chung từ kit (@tada/kit v0.3.0)' } },
      { kind: 'changed', text: { en: 'Removed the linked-email section from Settings (links are approved by the owner)', vi: 'Bỏ mục liên kết email khỏi Cài đặt (liên kết do chủ app duyệt)' } },
    ],
  },
  {
    version: '1.3.1',
    date: '2026-10-04',
    changes: [
      { kind: 'changed', text: { en: 'Removed the back-to-Workspace link from the header', vi: 'Bỏ link quay về Workspace trên header' } },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-04',
    changes: [
      { kind: 'added', text: { en: 'Switch language right from the account menu, without reloading', vi: 'Đổi ngôn ngữ ngay trong menu tài khoản, không cần tải lại trang' } },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-04',
    changes: [
      { kind: 'added', text: { en: 'Rate the app and send a message or a request from the account menu; the author is told right away', vi: 'Đánh giá ứng dụng và gửi lời nhắn hoặc yêu cầu ngay từ menu tài khoản; tác giả nhận được ngay' } },
      { kind: 'added', text: { en: 'Requests, always available with a short note: they ask for server storage while your data is in the browser, and can name another email to sync with; asking again updates the request', vi: 'Gửi yêu cầu (luôn có, cần ghi vài dòng): tự xin lưu trên server khi dữ liệu còn ở trình duyệt, có thể ghi email muốn đồng bộ; gửi lại sẽ cập nhật yêu cầu' } },
      { kind: 'added', text: { en: '"About the author" link in the account menu', vi: 'Link "Về tác giả" trong menu tài khoản' } },
      { kind: 'changed', text: { en: '"Ask for server storage" opens the request form in the account menu', vi: '"Yêu cầu lưu trên server" mở form yêu cầu trong menu tài khoản' } },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-03',
    changes: [
      { kind: 'added', text: { en: 'Settings: light theme, your own categories with icons, a monthly budget per category with an over-budget alert', vi: 'Cài đặt: giao diện sáng, danh mục riêng kèm biểu tượng, ngân sách tháng cho từng danh mục và cảnh báo khi vượt' } },
      { kind: 'added', text: { en: 'Quick math in the amount field, with calculator keys', vi: 'Tính nhanh ngay trong ô số tiền, có bàn phím máy tính' } },
      { kind: 'added', text: { en: 'Install as an app on Android and desktop', vi: 'Cài làm ứng dụng trên Android và máy tính' } },
      { kind: 'added', text: { en: 'Settings are kept on the server when your data is, so every device shares them', vi: 'Cài đặt được lưu trên server cùng dữ liệu, mọi thiết bị dùng chung' } },
      { kind: 'added', text: { en: 'Link another sign-in email to your account and see the same data', vi: 'Liên kết email đăng nhập khác với tài khoản của bạn để xem cùng dữ liệu' } },
      { kind: 'changed', text: { en: 'People already approved keep using the app when it is private; others see nothing', vi: 'Người đã được duyệt vẫn dùng được khi app để riêng tư; người khác không thấy gì' } },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-03',
    changes: [
      { kind: 'added', text: { en: 'Income and spending by category, with a quick add form, a searchable list grouped by day and CSV export', vi: 'Thu chi theo danh mục, form nhập nhanh, danh sách tìm kiếm theo ngày và xuất CSV' } },
      { kind: 'added', text: { en: 'Monthly view and statistics: savings rate, spending by weekday / week / month, heat-map calendar, category donut', vi: 'Xem theo tháng và thống kê: tỉ lệ tiết kiệm, chi theo thứ / tuần / tháng, lịch nhiệt, biểu đồ quạt theo danh mục' } },
      { kind: 'added', text: { en: 'Savings and investments, with total assets and profit', vi: 'Tiết kiệm và đầu tư, kèm tổng tài sản và lãi / lỗ' } },
      { kind: 'added', text: { en: 'Works without an account: data stays in this browser; signed-in users can ask for server storage to use it on every device', vi: 'Dùng được không cần tài khoản: dữ liệu lưu trên trình duyệt; người đăng nhập có thể xin lưu trên server để dùng trên mọi thiết bị' } },
      { kind: 'added', text: { en: 'iPhone Shortcut: log a payment from a bank receipt screen with on-device OCR', vi: 'Phím tắt iPhone: ghi khoản chi từ màn hình biên lai, OCR ngay trên máy' } },
      { kind: 'added', text: { en: 'Vietnamese and English, dark theme, phone and desktop layouts', vi: 'Tiếng Việt và tiếng Anh, giao diện tối, dùng tốt trên điện thoại và máy tính' } },
    ],
  },
]
