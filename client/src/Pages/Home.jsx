import { useState } from "react"
import { useNavigate } from "react-router";
import CompactPanel from "../Components/CompactPanel";
import OtpGenerator from "../Components/OtpGenerator";
import "../styles/Home.css"

const attackSteps = [
    ["01", "Phish code"],
    ["02", "Replay"],
    ["03", "Session"],
];

const authSteps = [
    ["01", "Bind user"],
    ["02", "Verify OTP"],
    ["03", "Issue token"],
];

export default function Home() {
    const navigate = useNavigate()
    const [tab, setTab] = useState(0)

    const handleChangeTab = (tab) => { setTab(tab) }

    return (
        <main className="app" aria-label="OTP Lab demos">
            <nav className="navigation" aria-label="Demo navigation">
                <div className="brand">
                    <span className="brand-mark" />
                    <span className="brand-text">OpTimus Prime</span>
                </div>
                {/* <p className="nav-meta">Generate&nbsp;&nbsp; Attack&nbsp;&nbsp; Apply</p> */}
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
                {tab === 2 && <aside className="side-panels">
                    <CompactPanel
                        kicker="Tab 02 / Offense Lab"
                        title="Attack OTP"
                        badge="SIM"
                        steps={attackSteps}
                        metaLeft="WINDOW 30s"
                        metaRight="RISK: real-time relay"
                    />
                    <CompactPanel
                        kicker="Tab 03 / OTP Appliance"
                        title="Login / Register OTP"
                        badge="PASS"
                        steps={authSteps}
                        metaLeft="TOTP SHA-1"
                        metaRight="CONTROL: rate-limit + nonce"
                    />
                </aside>}
            </section>
        </main>
    );
}