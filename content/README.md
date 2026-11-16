# Nội dung POI: bảng mô tả và audio

Chỉ chứa dữ liệu nội dung, không sửa file code nào. Chưa nối vào app: vị trí đặt file mp3 trong code sẽ do nhóm quyết định sau.

| File | Nội dung |
| --- | --- |
| `poi-descriptions.csv` | Bảng mô tả 27 POI, mỗi hàng một POI theo thứ tự id (UTF-8, mở được bằng Excel). Có thêm lời thuyết minh tiếng Anh dùng làm audio. |
| `poi-sources.csv` | Danh sách nguồn; mã `S1`, `S2`... trong cột "Nguồn" của bảng tham chiếu đến file này. |
| `audio/poi-XX.mp3` | 27 file thuyết minh tiếng Anh, đặt tên theo id của POI (`poi-01.mp3`, `poi-02.mp3`, `poi-05.mp3` ... `poi-29.mp3`). Id 3 và 4 không tồn tại trong DB. Mỗi file 30-54 giây, dưới 430 KB. |

## Cần đọc trước khi dùng

- **Mức xác minh** (cột trong bảng): `A` có nguồn; `B` một phần; `C` chưa có nguồn riêng cho địa điểm đó. Hiện có 4 POI mức A, 2 POI mức B và 21 POI mức C.
- Ở các POI mức C, ô ghi "Chưa tìm thấy nguồn công khai" nghĩa là chưa tìm được tài liệu, không phải trường không có thông tin. Lời thuyết minh của các POI này chỉ dựa trên tên địa điểm và thông tin chung của trường. Cần đối chiếu tại trường trước khi trích dẫn trong báo cáo.
- Nguồn đã dùng gồm Wikipedia, một bài báo (Tiền Phong 22/03/2026), mã phòng văn phòng khoa của Phòng Công tác Sinh viên (năm học 2021-2022) và thông báo thư viện năm 2019. Đây chưa phải tài liệu giới thiệu chính thức của trường. Danh sách khoa và giờ mở cửa có thể đã thay đổi.
- Mã phòng như `C.D301`, `1.A001`, `2.A003` được hiểu là Cơ sở chính/Cơ sở 1/Cơ sở 2 + tòa + số phòng. Đây là suy luận, chưa xác nhận.

## Về audio

- Tạo bằng giọng đọc có sẵn của Windows (Microsoft Zira Desktop), chạy cục bộ, mã hóa mono 64 kbps. Chất lượng còn máy móc.
- Chưa đọc kỹ điều khoản sử dụng của giọng Windows cho trường hợp đưa vào sản phẩm/bài tập. Nhóm cần kiểm tra trước khi dùng chính thức, hoặc thay bằng giọng thu âm/công cụ khác.
- Nếu sửa lời thuyết minh thì phải tạo lại file audio tương ứng.
