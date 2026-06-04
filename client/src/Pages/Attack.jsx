import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import "../styles/Home.css";

function generateRandomOtp() {
    return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

function buildFakeRequestLog(path, status) {
    const timestamp = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).format(new Date());
    return `[${timestamp}] POST ${path} HTTP/1.1" ${status}`;
}

function base32Decode(base32) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleaned = base32.replace(/=+$/g, "").toUpperCase();
    const bits = [];
    for (const char of cleaned) {
        const value = alphabet.indexOf(char);
        if (value === -1) continue;
        for (let bit = 4; bit >= 0; bit -= 1) {
            bits.push((value >> bit) & 1);
        }
    }
    const bytes = [];
    for (let i = 0; i + 7 < bits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j += 1) {
            byte = (byte << 1) | bits[i + j];
        }
        bytes.push(byte);
    }
    return new Uint8Array(bytes);
}

function intToBytes(num) {
    const result = new Uint8Array(8);
    for (let i = 7; i >= 0; i -= 1) {
        result[i] = num & 0xff;
        num /= 256;
    }
    return result;
}

async function hmacSha1(key, data) {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
    );
    const digest = await crypto.subtle.sign("HMAC", cryptoKey, data);
    return new Uint8Array(digest);
}

async function generateTotp(secret, step = 30, digits = 6) {
    const key = base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / step);
    const counterBytes = intToBytes(counter);
    const hmac = await hmacSha1(key, counterBytes);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24)
        | ((hmac[offset + 1] & 0xff) << 16)
        | ((hmac[offset + 2] & 0xff) << 8)
        | (hmac[offset + 3] & 0xff);
    return String(code % 10 ** digits).padStart(digits, "0");
}

export default function Attack() {
    const navigate = useNavigate();
    const [targetOtp, setTargetOtp] = useState(generateRandomOtp());
    const [bruteAttempts, setBruteAttempts] = useState(0);
    const [bruteLogs, setBruteLogs] = useState([]);
    const [bruteStatus, setBruteStatus] = useState("Sẵn sàng mô phỏng brute-force");
    const [isBruteRunning, setIsBruteRunning] = useState(false);

    const [replayOtp, setReplayOtp] = useState("");
    const [replayLogs, setReplayLogs] = useState([]);
    const [replayStatus, setReplayStatus] = useState("Chưa gửi replay request");
    const [replayCount, setReplayCount] = useState(0);
    const [replayTtl, setReplayTtl] = useState(0);
    const [replayLoading, setReplayLoading] = useState(false);

    const workerRef = useRef(null);
    const replayRefreshRef = useRef(null);
    const replayTtlRef = useRef(null);
    const replayStepRef = useRef(30);
    const serverBaseUrl = import.meta.env.VITE_SERVER_NAME || "";

    useEffect(() => {
        const worker = new Worker(new URL("../workers/AttackWorker.js", import.meta.url), { type: "module" });
        worker.onmessage = (event) => {
            const { type, log, attempts, success } = event.data;
            if (type === "update") {
                setBruteAttempts(attempts);
                setBruteStatus(`Đang tấn công... Lần thử ${attempts}`);
                setBruteLogs((prev) => {
                    const next = [...prev, log];
                    return next.length > 10 ? next.slice(-10) : next;
                });
            }
            if (type === "done") {
                setBruteAttempts(attempts);
                setBruteStatus(success
                    ? `Brute-force thành công sau ${attempts} lần thử.`
                    : `Brute-force dừng sau ${attempts} lần, không tìm thấy mã.`);
                setBruteLogs((prev) => {
                    const next = [...prev, log];
                    return next.length > 10 ? next.slice(-10) : next;
                });
                setIsBruteRunning(false);
            }
        };

        workerRef.current = worker;
        return () => {
            worker.terminate();
            if (replayRefreshRef.current) {
                clearInterval(replayRefreshRef.current);
            }
            if (replayTtlRef.current) {
                clearInterval(replayTtlRef.current);
            }
        };
    }, []);

    const resetBruteForce = () => {
        const next = generateRandomOtp();
        setTargetOtp(next);
        setBruteAttempts(0);
        setBruteLogs([]);
        setBruteStatus("Đã tạo mã OTP mới để tấn công");
        setIsBruteRunning(false);
    };

    const handleBruteGuess = () => {
        if (isBruteRunning || !workerRef.current) return;
        setIsBruteRunning(true);
        setBruteLogs([]);
        setBruteStatus("Bắt đầu brute-force...");
        workerRef.current.postMessage({ type: "start", targetOtp });
    };

    const updateTtl = (step) => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = step - (now % step);
        replayStepRef.current = step;
        setReplayTtl(remaining);
        if (remaining <= 0) {
            setReplayStatus("Mã TOTP đã hết hạn");
        }
    };

    const refreshReplayOtp = async () => {
        try {
            const response = await fetch(`${serverBaseUrl}/api/init-totp`);
            const data = await response.json();
            if (!response.ok || !data?.data?.secret) {
                throw new Error(data?.message || "Không lấy được secret TOTP");
            }
            const step = data.data.step || 30;
            const code = await generateTotp(data.data.secret, step);
            setReplayOtp(code);
            setReplayStatus("Mã TOTP đã được làm mới từ server.");
            updateTtl(step);
        } catch (error) {
            setReplayStatus(`Lỗi lấy TOTP: ${error.message}`);
            if (replayRefreshRef.current) {
                clearInterval(replayRefreshRef.current);
                replayRefreshRef.current = null;
            }
            if (replayTtlRef.current) {
                clearInterval(replayTtlRef.current);
                replayTtlRef.current = null;
            }
        }
    };

    const handlePrepareReplay = async () => {
        setReplayLoading(true);
        setReplayStatus("Đang lấy secret TOTP từ server...");
        setReplayLogs([]);
        if (replayRefreshRef.current) {
            clearInterval(replayRefreshRef.current);
            replayRefreshRef.current = null;
        }
        if (replayTtlRef.current) {
            clearInterval(replayTtlRef.current);
            replayTtlRef.current = null;
        }

        await refreshReplayOtp();

        replayRefreshRef.current = window.setInterval(() => {
            refreshReplayOtp();
        }, 30000);

        replayTtlRef.current = window.setInterval(() => {
            updateTtl(replayStepRef.current);
        }, 1000);

        setReplayLoading(false);
    };

    const handleReplayAttempt = async () => {
        if (replayLoading) return;
        if (!replayOtp) {
            setReplayStatus("Vui lòng nhấn 'Lấy mã TOTP' trước.");
            return;
        }

        setReplayLoading(true);
        const logs = [...replayLogs];
        let attemptIndex = replayCount;
        let lastResponse = "";

        for (let cycle = 1; cycle <= 3; cycle += 1) {
            attemptIndex += 1;
            try {
                const response = await fetch(`${serverBaseUrl}/api/otp/verify-totp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ otp: replayOtp })
                });
                const body = await response.json();
                const status = response.ok ? 200 : response.status;
                const log = { text: buildFakeRequestLog("/api/otp/verify-totp", status), status };
                logs.push(log);
                if (logs.length > 10) logs.shift();
                lastResponse = `Lần ${attemptIndex}: ${status} - ${body.message || body?.error || "Không rõ"}`;
            } catch (error) {
                const log = { text: buildFakeRequestLog("/api/otp/verify-totp", 500), status: 500 };
                logs.push(log);
                if (logs.length > 10) logs.shift();
                lastResponse = `Lần ${attemptIndex}: 500 - ${error.message}`;
            }
        }

        setReplayLogs(logs);
        setReplayCount(attemptIndex);
        setReplayStatus(`Replay đã gửi lại ${attemptIndex} lần. ${lastResponse}`);
        setReplayLoading(false);
    };

    const renderLog = (log, index) => (
        <div key={index} style={{ color: log.status === 200 ? "#16a34a" : "#ef4444", fontSize: "0.95rem" }}>
            {log.text}
        </div>
    );

    return (
        <main className="app" aria-label="Attack demo page">
            <nav className="navigation" aria-label="Attack navigation">
                <div className="brand">
                    <span className="brand-mark" />
                    <span className="brand-text">Attack Demo</span>
                </div>
                <div className="profile-nav-actions">
                    <button className="button" onClick={() => navigate("/")}>Trang chủ</button>
                </div>
            </nav>

            <section className="hero profile-hero">
                <div className="hero-copy">
                    <p className="eyebrow">Tấn công bảo mật OTP</p>
                    <h1>Demo Brute-force và Replay OTP</h1>
                    <p className="subcopy">
                        Hai mô phỏng giúp bạn hiểu lỗ hổng khi không giới hạn số lần thử OTP và khi không đánh dấu mã OTP đã sử dụng.
                    </p>
                </div>
            </section>

            <section className="profile-grid">
                <section className="profile-card">
                    <div className="panel-header">
                        <div className="panel-title-block">
                            <p className="kicker">Brute-force OTP</p>
                            <h2>Không giới hạn số lần thử</h2>
                        </div>
                    </div>
                    <p className="profile-help">
                        Mã OTP mục tiêu được sinh ngẫu nhiên và hiển thị rõ. Nhấn thử đoán để worker chạy vòng lặp 1.000.000 lần và gửi log giả về UI.
                    </p>
                    <p className="profile-help" style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: ".5rem" }}>
                        Mã OTP mục tiêu: <span style={{ fontSize: "1.5rem", color: "#111827" }}>{targetOtp}</span>
                    </p>
                    <button className="button" type="button" onClick={resetBruteForce}>Sinh lại mã OTP</button>
                    <button className="button" type="button" onClick={handleBruteGuess} disabled={isBruteRunning}>
                        {isBruteRunning ? "Đang tấn công..." : "Thử đoán OTP"}
                    </button>
                    <p className="profile-help">Tổng số lần thử: {bruteAttempts}</p>
                    <p className="profile-help">{bruteStatus}</p>
                    <div className="profile-help" style={{ whiteSpace: "pre-wrap", minHeight: 160 }}>
                        {bruteLogs.map(renderLog)}
                    </div>
                </section>

                <section className="profile-card">
                    <div className="panel-header">
                        <div className="panel-title-block">
                            <p className="kicker">Replay OTP</p>
                            <h2>Không đánh dấu mã đã dùng</h2>
                        </div>
                    </div>
                    <p className="profile-help">
                        Lấy secret TOTP từ server, sinh mã TOTP và gửi lại nhiều lần qua `/api/otp/verify-totp`.
                    </p>
                    <button className="button" type="button" onClick={handlePrepareReplay} disabled={replayLoading}>
                        {replayLoading ? "Đang lấy mã TOTP..." : "Lấy mã TOTP từ server"}
                    </button>
                    {replayOtp && (
                        <p className="profile-help" style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: ".5rem" }}>
                            Mã TOTP hiện tại: <span style={{ fontSize: "1.5rem", color: "#111827" }}>{replayOtp}</span>
                        </p>
                    )}
                    {/* {replayOtp && (
                        <p className="profile-help">Thời gian sống còn: <strong>{replayTtl}s</strong></p>
                    )} */}
                    <button className="button" type="button" onClick={handleReplayAttempt} disabled={replayLoading || !replayOtp}>
                        Replay mã OTP 3 lần
                    </button>
                    <p className="profile-help">Số lần replay đã gửi: {replayCount}</p>
                    <p className="profile-help">{replayStatus}</p>
                    <div className="profile-help" style={{ whiteSpace: "pre-wrap", minHeight: 160 }}>
                        {replayLogs.map(renderLog)}
                    </div>
                </section>
            </section>
        </main>
    );
}
