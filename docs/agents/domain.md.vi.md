# Tài liệu về miền

Cách các kỹ năng kỹ thuật nên sử dụng tài liệu miền của kho này khi khám phá cơ sở mã.

## Trước khi khám phá, hãy đọc các tài liệu sau

- **`CONTEXT.md`** tại gốc kho, hoặc
- **`CONTEXT-MAP.md`** tại gốc kho nếu tồn tại — nó trỏ đến một file `CONTEXT.md` cho mỗi ngữ cảnh. Đọc mỗi file liên quan đến chủ đề.
- **`docs/adr/`** — đọc các ADR chạm đến lĩnh vực bạn sắp làm việc. Trong kho có nhiều ngữ cảnh, cũng kiểm tra `src/<context>/docs/adr/` để tìm quyết định có phạm vi ngữ cảnh.

Nếu bất kỳ tệp nào trong số này không tồn tại, **tiếp tục im lặng**. Không đánh dấu về vắng mặt của chúng; không đề xuất tạo chúng trước khi thực sự cần. Kỹ năng sản xuất (`/grill-with-docs`) tạo chúng một cách lười biếng khi các thuật ngữ hoặc quyết định thực sự được giải quyết.

## Cấu trúc tệp

Kho đơn ngữ cảnh (hầu hết các kho):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Kho đa ngữ cảnh (có tồn tại `CONTEXT-MAP.md` tại gốc):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← quyết định có phạm vi toàn hệ thống
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← quyết định có phạm vi ngữ cảnh cụ thể
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Sử dụng từ vựng từ từ điển

Khi đầu ra của bạn đặt tên một khái niệm miền (trong tiêu đề vấn đề, một đề xuất tái cấu trúc, một giả thuyết, hoặc tên test), hãy sử dụng thuật ngữ như được định nghĩa trong `CONTEXT.md`. Đừng dịch chuyển sang các từ đồng nghĩa mà từ điển rõ ràng tránh.

Nếu khái niệm bạn cần chưa có trong từ điển, đó là một tín hiệu — hoặc bạn đang tạo ra ngôn ngữ mà dự án không sử dụng (hãy xem lại) hoặc có một khoảng trống thực (ghi chú cho `/grill-with-docs`).

## Đánh dấu xung đột ADR

Nếu đầu ra của bạn mâu thuẫn với một ADR hiện có, hãy nêu rõ điều đó thay vì bỏ qua lặng lẽ:

> _Mâu thuẫn với ADR-0007 (đơn hàng nguồn sự kiện) — nhưng đáng để mở lại vì…_