# Nội dung POI: bảng mô tả và audio

Chỉ chứa dữ liệu nội dung, không sửa file code nào. Chưa nối vào app: vị trí đặt file mp3 trong code sẽ do nhóm quyết định sau.

| File | Nội dung |
| --- | --- |
| `poi-descriptions.csv` | Bảng mô tả 27 POI, mỗi hàng một POI theo thứ tự id (UTF-8, mở được bằng Excel). Có thêm lời thuyết minh 5 ngôn ngữ (en, vi, ja, ko, zh) dùng làm audio. |
| `poi-sources.csv` | Danh sách nguồn; mã `S1`, `S2`... trong cột "Nguồn" của bảng tham chiếu đến file này. |
| `audio/<ngôn ngữ>/poi-XX.mp3` | Audio thuyết minh theo 5 ngôn ngữ của app: `en`, `vi`, `ja`, `ko`, `zh`. Mỗi thư mục có 27 file đặt tên theo id của POI (`poi-01.mp3`, `poi-02.mp3`, `poi-05.mp3` ... `poi-29.mp3`). Id 3 và 4 không tồn tại trong DB. |

Mỗi file dài khoảng 25-55 giây và dưới 450 KB; cả 135 file nặng khoảng 37 MB.

## Cần đọc trước khi dùng

- **Mức xác minh** (cột trong bảng): `A` có nguồn; `B` một phần; `C` chưa có nguồn riêng cho địa điểm đó. Hiện có 4 POI mức A, 2 POI mức B và 21 POI mức C.
- Ở các POI mức C, ô ghi "Chưa tìm thấy nguồn công khai" nghĩa là chưa tìm được tài liệu, không phải trường không có thông tin. Lời thuyết minh của các POI này chỉ dựa trên tên địa điểm và thông tin chung của trường. Cần đối chiếu tại trường trước khi trích dẫn trong báo cáo.
- Nguồn đã dùng gồm Wikipedia, một bài báo (Tiền Phong 22/03/2026), mã phòng văn phòng khoa của Phòng Công tác Sinh viên (năm học 2021-2022) và thông báo thư viện năm 2019. Đây chưa phải tài liệu giới thiệu chính thức của trường. Danh sách khoa và giờ mở cửa có thể đã thay đổi.
- Mã phòng như `C.D301`, `1.A001`, `2.A003` được hiểu là Cơ sở chính/Cơ sở 1/Cơ sở 2 + tòa + số phòng. Đây là suy luận, chưa xác nhận.

## Về lời thuyết minh nhiều ngôn ngữ

- Bản tiếng Anh là bản gốc. Bản tiếng Việt, Nhật, Hàn, Trung là bản dịch do Claude viết, **chưa có người bản ngữ đọc lại**; nên nhờ người thạo từng ngôn ngữ kiểm tra trước khi dùng thật. Tên địa danh theo cách dịch đã có trong DB.
- Một số câu trong lời thuyết minh là kiến thức chung hoặc câu đệm, không đến từ nguồn của SGU (ví dụ nhận xét về cầu lông, về các sự kiện thường tổ chức trong hội trường). Nếu muốn chỉ giữ dữ kiện có nguồn thì nên bỏ các câu này.

## Về audio

- Tạo bằng giọng đọc có sẵn của Windows, chạy cục bộ, mã hóa mono 64 kbps: en = Microsoft Zira; vi = Microsoft An; zh = Microsoft Huihui; ko = Microsoft Heami; ja = Microsoft Ayumi. Chất lượng còn máy móc và chưa được nghe thử kỹ cho từng file.
- Điều khoản sử dụng: giấy phép Windows 11 (bản OEM, 04/2024) không có điều khoản nào nói về audio do giọng đọc tạo ra, nên **chưa xác nhận được** việc dùng cho phát hành. Dùng cho bài tập thì rủi ro thấp, nhưng nên kiểm tra thêm hoặc đổi sang giọng thu âm/công cụ có điều khoản rõ ràng trước khi phát hành công khai.
- Nếu sửa lời thuyết minh thì phải tạo lại file audio tương ứng.
