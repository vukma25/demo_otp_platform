import React from "react";
import "../styles/Register.css"

const steps = [
  { number: "1", title: "Register", meta: "credentials", active: true },
  { number: "2", title: "Verify", meta: "otp code" },
  { number: "3", title: "Notification", meta: "delivery ready" },
];

const dataRows = {
  verify: [
    ["challenge", "6-digit SMS + email fallback"],
    ["guard", "3 attempts / 5 min lock"],
  ],
  notify: [
    ["route", "email receipt + device alert"],
    ["event", "account.created after OTP pass"],
  ],
};

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

function Field({ label, value, status, password }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-box">
        <input type="text" />
      </span>
      <span className="field-status">{status}</span>
    </label>
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
        {steps.map((step) => (
          <StepCard key={step.number} {...step} />
        ))}
      </section>

      <section className="content-grid">
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
            <Field label="Username" value="alice.operator" status="unique" />
            <Field label="Password" status="strong" password />
          </div>

          <aside className="rules">
            <div className="rules-title">Credential policy</div>
            <p>
              12+ characters &middot; mixed case &middot; number &middot;
              symbol &middot; checked against breached-password list
            </p>
          </aside>

          <div className="form-actions">
            <button className="primary-action" type="button">
              Create account
            </button>
            <span className="secondary-action">Next: verify OTP</span>
          </div>
        </section>

        <aside className="side-panel" aria-label="Verification and delivery">
          <header className="panel-header">
            <div className="panel-eyebrow">Verification / Delivery</div>
            <h2 className="panel-title">Channel readiness</h2>
            <p>
              Compact checks that follow the register step before notification
              handoff.
            </p>
          </header>
          <div className="panel-rule" />

          <DetailCard
            index="02"
            title="Verify OTP channel"
            caption="CODE ACCEPTANCE WINDOW"
            status="ARMED"
            rows={dataRows.verify}
            active
            measure={["52px", "18px"]}
          />

          <DetailCard
            index="03"
            title="Notification handoff"
            caption="POST-VERIFY SIGNALS"
            status="QUEUED"
            rows={dataRows.notify}
            measure={["34px", "46px"]}
          />

          <div className="telemetry">
            <span>TTL</span>
            <strong>04:58&nbsp; / &nbsp;RETRY 0</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}
