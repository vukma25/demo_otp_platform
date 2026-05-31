import { useState, useEffect } from "react";
import { useNavigate } from "react-router"
import Field from "../Components/Field";
import "../styles/Register.css"

const steps = [
  { number: 0, title: "Register", meta: "credentials" },
  { number: 1, title: "Verify", meta: "otp code" },
  { number: 2, title: "Notification", meta: "delivery ready" },
];

function StepCard({ number, title, meta, active }) {
  return (
    <div className={`step-card${active ? " step-card-active" : ""}`}>
      <div className={`step-number${active ? " step-number-active" : ""}`}>
        {number}
      </div>
      <div className="step-copy">
        <div className="step-title">{title}</div>
        <div className="step-meta">{meta}</div>
      </div>
    </div>
  );
}

function DetailCard({
  index,
  title,
  caption,
  status,
  rows,
  active,
  measure,
}) {
  return (
    <section className={`detail-card${active ? " detail-card-active" : ""}`}>
      <div className="detail-head">
        <div className={`detail-index${active ? " detail-index-active" : ""}`}>
          {index}
        </div>
        <div className="detail-title-wrap">
          <h3>{title}</h3>
          <p>{caption}</p>
        </div>
        <span className={`status-pill${active ? " status-pill-active" : ""}`}>
          {status}
        </span>
      </div>

      <div className="data-rows">
        {rows.map(([key, value]) => (
          <div className="data-row" key={key}>
            <span>{key}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="measure">
        <span style={{ width: measure[0] }} />
        <span style={{ width: measure[1] }} />
        <span />
      </div>
    </section>
  );
}

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [confirmPw, setConfirmPw] = useState("")
  const [notice, setNotice] = useState("")
  const [step, setStep] = useState(0)
  const [otp, setOtp] = useState("")
  const [verifyData, setVerifyData] = useState(null)

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

  const submitFormData = async () => {
    if (formData.email.length === 0) { setNotice("Email không được bỏ trống"); return }
    if (formData.password.length === 0) { setNotice("Mật khẩu không được để trống"); return }
    if (confirmPw.length === 0) { setNotice("Xác nhận lại mật khâu không được để trống"); return }
    if (confirmPw !== formData.password) { setNotice("Xác nhận lại mật khảu không khớp"); return }

    try {
      const form = new FormData()
      form.append("email", formData.email)
      form.append("password", formData.password)

      const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/register`, {
        "method": "POST",
        "body": form,
        "credentials": "include"
      })
      const data = await response.json()
      setStep(1)
    } catch (err) {
      setNotice(`Có lỗi xảy ra ${err}`)
    }
  }

  const checkValidateOtp = (otpVerifier) => {
    return /^\d+$/.test(otpVerifier) && otpVerifier.length === 6;
  }
  const verifyEmail = async () => {
    if (!checkValidateOtp(otp)) return
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/verify-otp`, {
        "method": "POST",
        "headers": { "Content-Type": "application/json" },
        "body": JSON.stringify({ "otp": otp }),
        "credentials": "include"
      })
      if (response.status === 200) {
        const data = await response.json()
        console.log(data)
        setVerifyData(data)
        setOtp("")
        setStep(2)
      }
    } catch (err) {
      setNotice(`Có lỗi xảy ra ${err}`)
    }
  }

  const activate2FA = async () => {
    if (!checkValidateOtp(otp)) return
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/enable-totp`, {
        "method": "POST",
        "headers": { "Content-Type": "application/json" },
        "body": JSON.stringify({ "id": verifyData.user_id, "otp": otp }),
      })
      if (response.status === 200) {
        const data = await response.json()
        console.log(data)
        navigate("/login")
      }
    } catch (err) {
      setNotice(`Có lỗi xảy ra ${err}`)
    }
  }

  useEffect(() => {
    let timer = null
    if (notice.length !== 0) {
      timer = setTimeout(() => {
        setNotice("")
      }, 1500)
    }

    return () => { if (timer) clearTimeout(timer) }
  }, [notice])

  return (
    <main className="register-frame" aria-label="Secure account onboarding">
      <nav className="top-nav">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>OTP LAB</span>
        </div>
        <div className="nav-meta">Register&nbsp;&nbsp; Verify&nbsp;&nbsp; Notify</div>
      </nav>

      <section className="hero-copy">
        <div className="eyebrow">Secure account onboarding</div>
        <h1>Create account with staged OTP protection</h1>
        <p>
          A three-step register flow collects username and password, verifies
          the OTP channel, then confirms notification readiness.
        </p>
      </section>

      <section className="stepper" aria-label="Registration progress">
        {steps.map((st) => (
          <StepCard
            key={st.number}
            active={st.number === step}
            {...st} number={st.number + 1} />
        ))}
      </section>

      {step === 0 && <section className="content-grid">
        <section className="register-panel" aria-label="Register credentials">
          <header className="form-header">
            <div className="form-kicker">STEP 01 / REGISTER</div>
            <h2>Start with account credentials</h2>
            <p>
              After creating credentials, the next step will bind a one-time
              password channel before notification delivery is enabled.
            </p>
          </header>

          <div className="credential-fields">
            <Field label="Username" value={formData.email} func={handleChangeEmail} />
            <Field type={"password"} label="Password" value={formData.password} func={handleChangePassword} />
            <Field type={"password"} label="Confirm password" value={confirmPw} func={handleConfirmPassword} />
          </div>

          {!!notice.length && <aside className="rules">
            <div className="rules-title">Cảnh báo</div>
            <p>{notice}</p>
          </aside>}

          <div className="form-actions">
            <button
              className="primary-action" type="button"
              onClick={submitFormData}>
              Create account
            </button>
            <span className="secondary-action">Next: verify OTP</span>
          </div>
        </section>
      </section>}
      {step === 1 && <section className="content-grid">
        <input type="text" onChange={handleTypeOtp} />
        <button onClick={verifyEmail}>Xác thực email</button>
      </section>}
      {step === 2 && <section className="content-grid">
        <img src={verifyData?.qr_code} alt="Mã quét 2FA" />

        <input type="text" id="totp_code" placeholder="Nhập mã 6 số" onChange={handleTypeOtp} />
        <button onClick={activate2FA}>Kích hoạt 2FA</button>
      </section>}
    </main>
  );
}
