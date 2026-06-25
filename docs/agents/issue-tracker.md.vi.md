# Bộ theo dõi vấn đề: GitHub

Các vấn đề và PRD của kho này tồn tại dưới dạng các vấn đề GitHub. Sử dụng CLI `gh` để thực hiện tất cả các thao tác.

## Quy ước

- **Tạo một vấn đề**: `gh issue create --title "..." --body "..."`. Sử dụng heredoc cho nội dung đa dòng.
- **Xem một vấn đề**: `gh issue view <số> --comments`, lọc các bình luận bằng `jq` cũng như lấy nhãn.
- **Liệt kê các vấn đề**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` với bộ lọc `--label` và `--state` thích hợp.
- **Bình luận trên một vấn đề**: `gh issue comment <số> --body "..."`
- **Áp dụng / xóa nhãn**: `gh issue edit <số> --add-label "..."` / `--remove-label "..."`
- **Đóng**: `gh issue close <số> --comment "..."`

Xác định kho từ `git remote -v` — `gh` tự động thực hiện điều này khi chạy bên trong một bản sao.

## Khi một kỹ năng nói "đăng lên bộ theo dõi vấn đề"

Tạo một vấn đề GitHub.

## Khi một kỹ năng nói "lấy vé liên quan"

Chạy `gh issue view <số> --comments`.