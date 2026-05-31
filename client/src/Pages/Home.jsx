import { useState } from "react"
import { useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/features/auth";
import CompactPanel from "../Components/CompactPanel";
import OtpGenerator from "../Components/OtpGenerator";
import "../styles/Home.css"

export default function Home() {
    const { user } = useSelector((state) => state.auth)
    const dispatch = useDispatch()

    const navigate = useNavigate()
    const [tab, setTab] = useState(0)

    const handleChangeTab = (tab) => { setTab(tab) }
    const handleLogout = () => {
        dispatch(logout())
    }

    return (
        <main className="app" aria-label="OTP Lab demos">
            <nav className="navigation" aria-label="Demo navigation">
                <div className="brand">
                    <span className="brand-mark" />
                    <span className="brand-text">OpTimus Prime</span>
                </div>
                {user && <div>
                    <p className="nav-meta">{user.user_id}</p>
                    <p className="nav-meta">{user.email}</p>
                    <button onClick={handleLogout}>Đăng xuất</button>
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

            <section className="tabs" aria-label="Demo tabs">
                <button
                    className={`tab ${tab === 1 ? "active" : ""}`}
                    onClick={() => { handleChangeTab(1) }}>1&nbsp;&nbsp; Sinh OTP</button>
                <button
                    className={`tab ${tab === 2 ? "active" : ""}`}
                    onClick={() => { handleChangeTab(2) }}>2&nbsp;&nbsp; Các tấn công OTP</button>
                <button
                    className={`tab ${tab === 3 ? "active" : ""}`}
                    onClick={() => { handleChangeTab(3); navigate("/register") }}>3&nbsp;&nbsp; Đăng nhập + Đăng ký</button>
            </section>

            <section className="content-grid">
                {tab === 1 && <OtpGenerator />}
                {tab === 2 && <div></div>}
            </section>
        </main>
    );
}