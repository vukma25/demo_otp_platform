import { useState } from "react"
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import OtpGenerator from "../Components/OtpGenerator";
import "../styles/Home.css"

export default function Home() {
    const { user } = useSelector((state) => state.auth)

    const navigate = useNavigate()
    const [tab, setTab] = useState(1)
    const avatarLetter = user?.email ? user.email.charAt(0).toUpperCase() : ""

    const handleChangeTab = (tab) => { setTab(tab) }

    return (
        <main className="app" aria-label="OTP Lab demos">
            <nav className="navigation" aria-label="Điều hướng">
                <div className="brand">
                    <span className="brand-mark" />
                    <span className="brand-text">OpTimus Prime</span>
                </div>
                {user && <div className="user-panel">
                    <button
                        type="button"
                        className="avatar-button"
                        onClick={() => navigate("/profile")}
                        title="Mở hồ sơ"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            backgroundColor: "#4f46e5",
                            color: "#fff",
                            border: "none",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12
                        }}
                    >
                        {avatarLetter}
                    </button>
                </div>}
            </nav>

            <section className="hero">
                <div className="hero-copy">
                    <p className="eyebrow">Bản demo tương tác về bảo mật OTP</p>
                    <h1>Tìm hiểu cách mã OTP được tạo, chặn và áp dụng một cách an toàn.</h1>
                    <p className="subcopy">
                        Trang chủ hướng dẫn kiểm thử mật khẩu dùng một lần, từ logic của nhà phát hành
                        đến các đường dẫn tấn công và màn hình xác thực thực tế.
                    </p>
                </div>
            </section>

            <section className="home-overview">
                <article className="home-card">
                    <p className="kicker">Tổng quan</p>
                    <h3>Học cách OTP vận hành</h3>
                    <p>Khám phá cách OTP được sinh, gửi và xác thực, đồng thời hiểu các rủi ro khi thiết kế hệ thống xác thực.</p>
                </article>
                <article className="home-card">
                    <p className="kicker">An toàn</p>
                    <h3>Kiểm tra lỗ hổng</h3>
                    <p>Hai mô phỏng brute-force và replay giúp bạn thấy rõ hiện tượng tấn công thực tế và cách bảo vệ.</p>
                </article>
                <article className="home-card">
                    <p className="kicker">Bắt đầu</p>
                    <h3>Đi tới các bước tiếp theo</h3>
                    <p>Nhấn vào tab để xem demo sinh OTP, tấn công giả lập hoặc chuyển sang đăng ký/đăng nhập.</p>
                </article>
            </section>

            <section className="tabs" aria-label="Demo tabs">
                <button
                    className={`tab ${tab === 1 ? "active" : ""}`}
                    onClick={() => { handleChangeTab(1) }}>1&nbsp;&nbsp; Sinh OTP</button>
                <button
                    className={`tab ${tab === 2 ? "active" : ""}`}
                    onClick={() => { handleChangeTab(2); navigate("/attack") }}>
                    2&nbsp;&nbsp; Các tấn công OTP
                </button>
                <button
                    className={`tab ${tab === 3 ? "active" : ""}`}
                    onClick={() => { handleChangeTab(3); navigate("/register") }}>
                    3&nbsp;&nbsp; Đăng nhập + Đăng ký
                </button>
            </section>

            <section className="content-grid">
                {tab === 1 && <OtpGenerator />}
                {tab === 2 && <div></div>}
            </section>
        </main>
    );
}