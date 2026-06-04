import { useState, useEffect, useLayoutEffect } from "react";
import { useSelector, useDispatch } from "react-redux"
import { useNavigate } from "react-router";
import Field from "../Components/Field";
import { clear, preLogin, remainStateLogin, resendEmailLogin } from "../redux/features/login";
import { loginCompleted, setSuccess } from "../redux/features/auth";
import "../styles/Login.css"

export default function Login() {
  const { success, authLoading, error } = useSelector((state) => state.auth)
  const { data: { login, resend }, loginLoading, error: e } = useSelector((state) => state.login)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [loginData, setLoginData] = useState({ "email": "", "password": "" })
  const [otp, setOtp] = useState("")
  const [timer, setTimer] = useState(null)

  const handleChangeEmail = (e) => {
    setLoginData(prev => ({ ...prev, email: e.target.value }))
  }
  const handleChangePassword = (e) => {
    setLoginData(prev => ({ ...prev, password: e.target.value }))
  }
  const handleChangeOTP = (e) => {
    setOtp(e.target.value)
  }

  const handleLogin = () => {
    dispatch(preLogin(loginData))
  }

  const handleCompleteLogin = () => {
    dispatch(loginCompleted({ "otp": otp }))
  }

  const handleResendEmail = () => {
    dispatch(resendEmailLogin())
  }

  useEffect(() => {
    if (success) { navigate("/"); dispatch(clear()); dispatch(setSuccess()) }
  }, [success])

  useEffect(() => {
    if (resend?.resend_after > 0) {
      setTimer(resend?.resend_after)
    }
  }, [resend])

  useEffect(() => {
    if (timer <= 0) return

    const interval = setInterval(() => {
      setTimer(prev => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [timer])

  useLayoutEffect(() => {
    dispatch(remainStateLogin())
  }, [])

  console.log(login, resend)

  return (
    <main className="login-frame" aria-label="OTP login">
      <nav className="top-nav">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>OTP LAB</span>
        </div>
        <div className="top-actions">
          <button className="button" type="button" onClick={() => navigate("/")}>Trang chủ</button>
          <button className="secondary-button" type="button" onClick={() => navigate("/register")}>Đăng ký</button>
        </div>
      </nav>

      <section className="hero-copy">
        <div className="eyebrow">Đăng nhập OTP</div>
        <h1>Đăng nhập bằng Email và OTP</h1>
        <p>
          Đăng nhập bảo mật với email và mã xác thực một lần. Hệ thống sẽ kiểm tra
          danh tính và sau đó yêu cầu OTP để hoàn tất.
        </p>
      </section>

      <section className="content-grid">
        <section className="login-panel" aria-label="Biểu mẫu đăng nhập">
          <header className="login-header">
            <div className="form-kicker">Đăng nhập</div>
            <h2>Xác thực bằng OTP</h2>
            <p>
              Nhập email, mật khẩu và mã OTP hiện tại để hoàn tất đăng nhập an toàn.
            </p>
          </header>

          <div className="fields">
            <Field label={"Email"} value={login?.email || loginData.email} func={handleChangeEmail} disable={!!login} />
            {!login && <Field label={"Mật khẩu"} type={"password"} value={loginData.password} func={handleChangePassword} />}
            {login && <Field label={"Mã OTP"} value={otp} func={handleChangeOTP} />}
          </div>

          <div className="login-actions">
            <button
              className="button"
              disabled={authLoading || loginLoading}
              onClick={() => {
                if (!login) { handleLogin() }
                else { handleCompleteLogin() }
              }}>
              {!!login ? "Xác thực" : "Đăng nhập"}
            </button>
            {login?.otp_type === "hotp" && <button className="button" onClick={handleResendEmail} disabled={timer > 0 || loginLoading}>Gửi lại email {resend?.resend_after > 0 ? `sau ${timer}` : ""}</button>}
          </div>
        </section>
      </section>
    </main>
  );
}
