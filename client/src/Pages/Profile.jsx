import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { fetchProfile, fetchQrCode, activateTotp, resetPassword } from "../redux/features/profile";
import { logout } from "../redux/features/auth";
import "../styles/Home.css";

export default function Profile() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { profile, qrCode, profileLoading, actionLoading, message, error } = useSelector((state) => state.profile);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetOtp, setResetOtp] = useState("");
    const [totpOtp, setTotpOtp] = useState("");
    const [localNotice, setLocalNotice] = useState("");

    useEffect(() => {
        if (!user) {
            navigate("/");
            return;
        }
        dispatch(fetchProfile());
    }, [user, navigate, dispatch]);

    const handleFetchQrCode = () => {
        setLocalNotice("");
        dispatch(fetchQrCode());
    };

    const handleActivateTotp = () => {
        if (!totpOtp.trim()) {
            setLocalNotice("Vui lòng nhập mã TOTP để kích hoạt.");
            return;
        }
        dispatch(activateTotp(totpOtp));
    };

    const handleTogglePasswordForm = () => {
        if (!profile?.totp_enable) {
            setLocalNotice("Cần kích hoạt TOTP trước khi đổi mật khẩu.");
            return;
        }
        setLocalNotice("");
        setShowPasswordForm((prev) => !prev);
    };

    const handleResetPassword = () => {
        if (!password || !confirmPassword || !resetOtp.trim()) {
            setLocalNotice("Cần nhập đầy đủ mật khẩu và mã OTP.");
            return;
        }

        if (password !== confirmPassword) {
            setLocalNotice("Mật khẩu và xác nhận mật khẩu không khớp.");
            return;
        }

        dispatch(resetPassword({ password, otp: resetOtp }));
    };

    const formatDate = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString("vi-VN", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    const feedbackMessage = localNotice || message || error
    const isSuccess = message && message.toLowerCase().includes("thành công");

    return (
        <main className="app profile-page" aria-label="Profile page">
            <nav className="navigation" aria-label="Profile navigation">
                <div className="brand">
                    <span className="brand-mark" />
                    <span className="brand-text">Hồ sơ người dùng</span>
                </div>
                <div className="profile-nav-actions">
                    <button className="button" onClick={() => navigate("/")}>Trang chủ</button>
                    <button className="secondary-button" onClick={() => { dispatch(logout()) }}>Đăng xuất</button>
                </div>
            </nav>

            <section className="hero profile-hero">
                <div className="hero-copy">
                    <p className="eyebrow">Thông tin tài khoản</p>
                    <h1>Quản lý hồ sơ và bảo mật</h1>
                    <p className="subcopy">
                        Xem dữ liệu tài khoản của bạn, kiểm tra trạng thái TOTP và đổi mật khẩu
                        an toàn bằng mã số một lần.
                    </p>
                </div>
            </section>

            <section className="profile-grid">
                <section className="profile-card">
                    <div className="panel-header">
                        <div className="panel-title-block">
                            <p className="kicker">Thông tin người dùng</p>
                            <h2>Chi tiết cơ bản</h2>
                        </div>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">Mã người dùng</span>
                        <span className="profile-value">{user?.user_id || "-"}</span>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">Email</span>
                        <span className="profile-value">{user?.email || "-"}</span>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">Ngày tạo</span>
                        <span className="profile-value">{formatDate(profile?.created_at)}</span>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">TOTP</span>
                        <span className={`profile-status ${profile?.totp_enable ? "active" : "inactive"}`}>
                            {profile?.totp_enable ? "Đã kích hoạt" : "Chưa kích hoạt"}
                        </span>
                    </div>
                </section>

                <section className="profile-card">
                    <div className="panel-header">
                        <div className="panel-title-block">
                            <p className="kicker">Bảo mật 2 lớp</p>
                            <h2>Quản lý TOTP</h2>
                        </div>
                    </div>

                    {!profile?.totp_enable && (
                        <div className="profile-form">
                            <p className="profile-help">
                                Quét mã QR bằng ứng dụng Authenticator, sau đó nhập mã 6 chữ số để kích hoạt.
                            </p>
                            <button className="badge" type="button" onClick={handleFetchQrCode} disabled={actionLoading}>
                                {actionLoading ? "Đang xử lý..." : "Lấy mã QR để quét"}
                            </button>
                            {qrCode && (
                                <div className="qr-box">
                                    <img src={qrCode} alt="QR kích hoạt TOTP" />
                                </div>
                            )}
                            {qrCode && (
                                <input
                                    type="text"
                                    className="profile-input"
                                    placeholder="Nhập mã TOTP 6 chữ số"
                                    value={totpOtp}
                                    onChange={(e) => setTotpOtp(e.target.value)}
                                />
                            )}
                            {qrCode && (
                                <button
                                    className="button"
                                    type="button"
                                    onClick={handleActivateTotp}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? "Đang kích hoạt..." : "Kích hoạt TOTP"}
                                </button>
                            )}
                        </div>
                    )}

                    {!!profile?.totp_enable && (
                        <div className="profile-form">
                            <p className="profile-help">
                                TOTP đã được bật. Bạn có thể đổi mật khẩu bằng mã xác thực một lần.
                            </p>
                            <button className="badge light" type="button" onClick={handleFetchQrCode} disabled={actionLoading}>
                                {actionLoading ? "Đang xử lý..." : "Xem lại mã QR TOTP"}
                            </button>
                            {qrCode && (
                                <div className="qr-box">
                                    <img src={qrCode} alt="QR TOTP" />
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </section>

            {!!feedbackMessage && (
                <section className="status-card profile-message">
                    <p className={isSuccess ? "success" : "fail"}>{feedbackMessage}</p>
                </section>
            )}
            <section className="profile-card">
                <div className="panel-header">
                    <div className="panel-title-block">
                        <p className="kicker">Bảo mật mật khẩu</p>
                        <h2>Đổi mật khẩu</h2>
                    </div>
                </div>
                <div className="profile-actions">
                    <button className="badge light" type="button" onClick={handleTogglePasswordForm}>
                        {showPasswordForm ? "Ẩn form" : "Đổi mật khẩu"}
                    </button>
                    <span className="profile-help">
                        Form chỉ mở khi TOTP được bật và đã có mã xác thực.
                    </span>
                </div>

                {showPasswordForm && (
                    <div className="profile-form">
                        <input
                            type="password"
                            className="profile-input"
                            placeholder="Mật khẩu mới"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <input
                            type="password"
                            className="profile-input"
                            placeholder="Xác nhận mật khẩu"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <input
                            type="text"
                            className="profile-input"
                            placeholder="Mã OTP TOTP"
                            value={resetOtp}
                            onChange={(e) => setResetOtp(e.target.value)}
                        />
                        <div className="profile-form-row">
                            <button
                                className="badge"
                                type="button"
                                onClick={handleResetPassword}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Đang lưu..." : "Lưu mật khẩu mới"}
                            </button>
                            <button
                                className="badge light"
                                type="button"
                                onClick={() => setShowPasswordForm(false)}
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {profileLoading && <section className="status-card"><p>Đang tải dữ liệu...</p></section>}
        </main>
    );
}
