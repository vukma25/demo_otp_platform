import { useState, useEffect, useLayoutEffect } from "react";
import { useSelector, useDispatch } from "react-redux"
import { useNavigate } from "react-router";
import Field from "../Components/Field";
import { setSuccess, loginCompleted } from "../redux/features/auth";
import "../styles/Login.css"

export default function Login() {
  const { success, authLoading, error } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [loginData, setLoginData] = useState({ "email": "", "password": "" })
  const [responseData, setResponseData] = useState(null)
  const [otp, setOtp] = useState("")

  const handleChangeEmail = (e) => {
    setLoginData(prev => ({ ...prev, email: e.target.value }))
  }
  const handleChangePassword = (e) => {
    setLoginData(prev => ({ ...prev, password: e.target.value }))
  }
  const handleChangeOTP = (e) => {
    setOtp(e.target.value)
  }

  const handleLogin = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/login`, {
        "method": "POST",
        "headers": { "Content-Type": "application/json" },
        "body": JSON.stringify(loginData),
        "credentials": "include"
      })

      if (response.status === 200) {
        const data = await response.json()
        setResponseData(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCompleteLogin = () => {
    dispatch(loginCompleted({ "otp": otp }))
  }

  // useEffect(() => {
  //   if (success) { navigate("/"); dispatch(setSuccess()) }
  // }, [success])

  useLayoutEffect(() => {
    async function remainState() {
      try {
        const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/login-state`, {
          "method": "GET",
          "credentials": "include"
        })

        if (response.status === 202) {
          const data = await response.json()
          console.log(data)
          setResponseData(data)
          setLoginData(prev => ({ ...prev, "email": data.email }))
        }
      } catch (err) {
        console.error(err)
      }
    }
    remainState()
  }, [])

  return (
    <main className="login-frame" aria-label="OTP login">
      <nav className="top-nav">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>OTP LAB</span>
        </div>
        <div className="nav-meta">Username&nbsp;&nbsp; Email&nbsp;&nbsp; OTP</div>
      </nav>

      <section className="hero-copy">
        <div className="eyebrow">OTP login</div>
        <h1>Sign in with username, email, and OTP</h1>
        <p>
          A compact login checkpoint with no password step: identity is matched
          by username and email, then verified by one-time password.
        </p>
      </section>

      <section className="content-grid">
        <section className="login-panel" aria-label="Three field login form">
          <header className="login-header">
            <div className="form-kicker">Login / three field check</div>
            <h2>Identity plus one-time password</h2>
            <p>
              Enter username, email, and the current OTP from your authenticator
              to complete sign-in.
            </p>
          </header>

          <div className="fields">
            <Field label={"Email"} value={loginData.email} func={handleChangeEmail} disabled={!!responseData} />
            {!responseData && <Field label={"Password"} type={"password"} value={loginData.password} func={handleChangePassword} />}
            {responseData && <Field label={"OTP"} value={loginData.otp} func={handleChangeOTP} />}
          </div>

          <div className="login-actions">
            <button
              className="button" disabled={authLoading}
              onClick={() => {
                if (!responseData) { handleLogin() }
                else { handleCompleteLogin() }
              }}>
              {!!responseData ? "Xác thực" : "Đăng nhập"}
            </button>
          </div>

          <aside className="hint">
            <div className="hint-title">No password field</div>
            <p>
              This redesigned login uses exactly username, email, and OTP as
              the required inputs.
            </p>
          </aside>
        </section>
      </section>
    </main>
  );
}
