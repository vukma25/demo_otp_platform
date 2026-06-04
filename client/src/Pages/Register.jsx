import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router"
import { useSelector, useDispatch } from "react-redux"
import { clear, submitFormData, verifyEmail, resendVerifyEmail, activate2FA, remainState } from "../redux/features/register";
import { checkValidateOtp } from "../utilities/validator";
import Field from "../Components/Field";
import "../styles/Register.css"

const steps = [
  { number: 0, title: "Đăng ký", meta: "Thông tin" },
  { number: 1, title: "Xác minh", meta: "Mã OTP" },
  { number: 2, title: "Kích hoạt", meta: "Sẵn sàng" },
];

function StageCard({ number, title, meta, active }) {
  return (
    <div className={`stage-card${active ? " stage-card-active" : ""}`}>
      <div className={`stage-number${active ? " stage-number-active" : ""}`}>
        {number}
      </div>
      <div className="stage-copy">
        <div className="stage-title">{title}</div>
        <div className="stage-meta">{meta}</div>
      </div>
    </div>
  );
}

export default function Register() {
  const { data: { submit, verify, resend, active }, regLoading, error, success, step } = useSelector((state) => state.reg)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({ email: "", password: "" })
  const [confirmPw, setConfirmPw] = useState("")
  const [notice, setNotice] = useState("")
  const [otp, setOtp] = useState("")
  const [verifyData, setVerifyData] = useState(null)
  const [res, setRes] = useState(null)
  const [timer, setTimer] = useState(null)

  const handleChangeEmail = (e) => {
    setFormData(prev => ({ ...prev, email: e.target.value }))
  }
  const handleChangePassword = (e) => {
    setFormData(prev => ({ ...prev, password: e.target.value }))
  }
  const handleConfirmPassword = (e) => {
    setConfirmPw(e.target.value)
  }
  const handleTypeOtp = (e) => {
    setOtp(e.target.value)
  }

  const handleSubmitFormData = () => {
    if (formData.email.length === 0) { setNotice("Email không được bỏ trống"); return }
    if (formData.password.length === 0) { setNotice("Mật khẩu không được để trống"); return }
    if (confirmPw.length === 0) { setNotice("Xác nhận lại mật khâu không được để trống"); return }
    if (confirmPw !== formData.password) { setNotice("Xác nhận lại mật khảu không khớp"); return }
    const form = new FormData()
    form.append("email", formData.email)
    form.append("password", formData.password)

    dispatch(submitFormData(form))
  }

  const handleVerifyEmail = () => {
    if (!checkValidateOtp(otp)) return
    dispatch(verifyEmail({ "otp": otp }))
    setOtp("")
  }

  const handleResendVerifyEmail = () => {
    dispatch(resendVerifyEmail())
  }

  const handleActivate2FA = () => {
    if (!checkValidateOtp(otp)) return
    dispatch(activate2FA({ "id": verify.user_id, "otp": otp }))
  }

  useEffect(() => {
    if (error) { setNotice(error?.message) }
  }, [error])

  useEffect(() => {
    let timer = null
    if (notice.length !== 0) {
      timer = setTimeout(() => {
        setNotice("")
      }, 1500)
    }

    return () => { if (timer) clearTimeout(timer) }
  }, [notice])

  useLayoutEffect(() => {
    dispatch(remainState())
  }, [])

  useEffect(() => {
    if (submit?.resend_after > 0) {
      setTimer(submit.resend_after)
    }
    if (resend?.resend_after > 0) {
      setTimer(resend?.resend_after)
    }
  }, [submit, resend])

  useEffect(() => {
    if (timer <= 0) return

    const interval = setInterval(() => {
      setTimer(prev => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [timer])

  useEffect(() => { if (success) { navigate("/login"); dispatch(clear()) } }, [success])

  return (
    <main className="register-frame" aria-label="Secure account onboarding">
      <nav className="top-nav">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>OTP LAB</span>
        </div>
        <div className="top-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>Trang chủ</button>
          <button className="button" type="button" onClick={() => navigate("/login")}>Đăng nhập</button>
        </div>
      </nav>

      <section className="hero-copy">
        <div className="eyebrow">Đăng ký tài khoản an toàn</div>
        <h1>Tạo tài khoản với bảo mật OTP</h1>
        <p>
          Quy trình đăng ký gồm ba bước: tạo thông tin tài khoản, xác minh mã OTP,
          và hoàn tất kích hoạt bảo mật.
        </p>
      </section>

      <section className="stepper" aria-label="Registration progress">
        {steps.map((st) => (
          <StageCard
            key={st.number}
            active={st.number === step}
            {...st} number={st.number + 1} />
        ))}
      </section>

      {step === 0 && <section className="content-grid">
        <section className="register-panel" aria-label="Đăng ký tài khoản">
          <header className="form-header">
            <div className="form-kicker">Đăng ký</div>
            <h2>Bắt đầu với thông tin tài khoản</h2>
            <p>
              Sau khi tạo thông tin, bước tiếp theo sẽ kích hoạt kênh OTP để hoàn tất đăng ký.
            </p>
          </header>

          <div className="credential-fields">
            <Field label="Email" value={formData.email} func={handleChangeEmail} />
            <Field type={"password"} label="Mật khẩu" value={formData.password} func={handleChangePassword} />
            <Field type={"password"} label="Xác nhận mật khẩu" value={confirmPw} func={handleConfirmPassword} />
          </div>

          {!!notice.length && <aside className="rules">
            <div className="rules-title">Cảnh báo</div>
            <p>{notice}</p>
          </aside>}

          <div className="form-actions">
            <button
              className="primary-action" type="button"
              onClick={handleSubmitFormData}>
              Tạo tài khoản
            </button>
          </div>
        </section>
      </section>}
      {step === 1 && <section className="content-grid">
        <section className="register-panel" aria-label="Xác minh email">
          <header className="form-header">
            <div className="form-kicker">Xác minh</div>
            <h2>Xác thực kênh email</h2>
            <p>Nhập mã một lần được gửi đến email của bạn.</p>
          </header>

          <div className="credential-fields">
            <Field label="Mã xác minh" value={otp} func={handleTypeOtp} />
          </div>

          <div className="form-actions">
            <button className="primary-action" type="button" onClick={handleVerifyEmail}>
              Xác minh email
            </button>
            <button className="secondary-button" type="button" onClick={handleResendVerifyEmail} disabled={timer > 0 || regLoading}>
              Gửi lại mã {timer ? `sau ${timer}s` : ""}
            </button>
          </div>
        </section>
      </section>}
      {step === 2 && <section className="content-grid">
        <section className="register-panel" aria-label="Kích hoạt TOTP">
          <header className="form-header">
            <div className="form-kicker">Kích hoạt TOTP</div>
            <h2>Bật xác thực hai yếu tố</h2>
            <p>Quét mã QR bằng ứng dụng Authenticator và nhập mã 6 chữ số.</p>
          </header>

          <div className="credential-fields">
            {verify?.qr_code ? (
              <img className="qr-code" src={verify.qr_code} alt="Mã QR TOTP" />
            ) : (
              <div className="rules">Mã QR đang tải hoặc chưa sẵn sàng.</div>
            )}
            <Field label="Mã TOTP" value={otp} func={handleTypeOtp} />
          </div>

          <div className="form-actions">
            <button className="primary-action" type="button" onClick={handleActivate2FA}>
              Kích hoạt TOTP
            </button>
            <button className="secondary-button" type="button" onClick={() => navigate("/login")}>Đến đăng nhập</button>
          </div>
        </section>
      </section>}
    </main>
  );
}
