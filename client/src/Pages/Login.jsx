import React from "react";
import "../styles/Login.css"

const headerFields = [
  { label: "Username", value: "alice.operator", status: "matched" },
  { label: "Email", value: "alice@otp-lab.dev", status: "confirmed" },
  { label: "OTP", value: "428 619", status: "18s left", strong: true },
];

const requiredFields = [
  { index: "01", label: "Username", state: "ID" },
  { index: "02", label: "Email", state: "DELIVERY" },
  { index: "03", label: "OTP", state: "6 DIGITS", active: true },
];

function FieldBlock({ label, value, status, strong }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-box">
        <span className={strong ? "field-value field-value-strong" : "field-value"}>
          {value}
        </span>
        <span className="field-status">{status}</span>
      </span>
    </label>
  );
}

function SupportRow({ index, label, state, active }) {
  return (
    <div className={`support-row${active ? " support-row-active" : ""}`}>
      <span className="support-index">{index}</span>
      <span className="support-label">{label}</span>
      <span className="support-state">{state}</span>
    </div>
  );
}

export default function Login() {
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
            {headerFields.map((field) => (
              <FieldBlock key={field.label} {...field} />
            ))}
          </div>

          <div className="login-actions">
            <button className="button" type="button">
              Verify login
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

        <aside className="support-panel" aria-label="OTP login support panel">
          <header className="support-header">
            <div className="support-topline">
              <div className="panel-eyebrow">Auth support / OTP</div>
              <span className="ready-badge">READY</span>
            </div>
            <h2>Three-field sign-in</h2>
            <p>
              Username, email, and one-time code only. No password or scan step
              is part of this flow.
            </p>
          </header>

          <section className="status-block">
            <div className="status-row">
              <span className="status-label">SESSION STATE</span>
              <span className="ready-badge">READY</span>
            </div>
            <div className="status-copy">
              Send the OTP to the email on this form; keep the username stable
              during retry.
            </div>
          </section>

          <section className="required-fields" aria-label="Required inputs">
            <div className="required-title">REQUIRED INPUTS</div>
            {requiredFields.map((field) => (
              <SupportRow key={field.index} {...field} />
            ))}
          </section>

          <section className="help-block">
            <div className="help-title">HELP CONDITIONS</div>
            <p>
              Expired code? Verify email, then request a new OTP. Attempts stay
              linked to the same username.
            </p>
            <div className="help-rule" />
            <div className="help-meta">TTL 05:00 / RETRY 03</div>
          </section>
        </aside>
      </section>
    </main>
  );
}
