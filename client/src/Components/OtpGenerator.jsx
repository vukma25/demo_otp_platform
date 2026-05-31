import { useEffect, useState, useCallback, useRef } from "react"
import CryptoJS from "crypto-js"
import { base32Decode } from "../utilities/decode";
import Badge from "./Badge";
import StepCard from "./StepCard";
import Verifier from "./Verifier";
import Resync from "./Resync";

// Sinh mã HOTP
function generateHOTPWithDebug(secret, counter, digits = 6) {
    // ========== BƯỚC 1: Chuyển counter thành bytes (big-endian 8 bytes) ==========
    //const counterBuf = new ArrayBuffer(counter);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);

    // 2. Ghi giá trị counter vào dưới dạng 64-bit unsigned integer (Big-Endian)
    view.setBigUint64(0, BigInt(counter), false);

    // 3. Chuyển thành Uint8Array để xử lý tiếp
    const counterBytes = new Uint8Array(buffer);

    // 4. Chuyển thành Hex string
    const counterHex = Array.from(counterBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const step1 = {
        label: 'Bước 1: Chuyển counter thành bytes',
        meta_data: {
            counter: counter,
            counter_hex: counterHex,
        },
        description: `Counter = ${counter} → Bytes (big-endian): ${counterHex}`
    };

    // ========== BƯỚC 2: Decode Secret từ Base32 ==========
    const secretBytes = base32Decode(secret);
    const secretHex = Array.from(secretBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const step2 = {
        label: 'Bước 2: Decode Secret Key (Base32)',
        meta_data: {
            secret_base32: secret,
            secret_hex: secretHex,
        },
        description: `Secret "${secret}" → Hex: ${secretHex}`
    };

    // ========== BƯỚC 3: Tính HMAC-SHA1 ==========
    const secretWordArray = CryptoJS.lib.WordArray.create(secretBytes);
    const counterWordArray = CryptoJS.enc.Hex.parse(counterHex);
    const hmac = CryptoJS.HmacSHA1(counterWordArray, secretWordArray);
    const hmacHex = hmac.toString(CryptoJS.enc.Hex);

    const step3 = {
        label: 'Bước 3: Tính HMAC-SHA1',
        meta_data: {
            hmac_hex: hmacHex,
        },
        description: `HMAC-SHA1(Secret, Counter) = ${hmacHex}`
    };

    // ========== BƯỚC 4: Dynamic Truncation ==========
    // Chuyển chuỗi hex của HMAC thành mảng byte
    const hmacBytes = [];
    for (let i = 0; i < hmacHex.length; i += 2) {
        hmacBytes.push(parseInt(hmacHex.substring(i, i + 2), 16));
    }

    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const truncated =
        ((hmacBytes[offset] & 0x7f) << 24) |
        ((hmacBytes[offset + 1] & 0xff) << 16) |
        ((hmacBytes[offset + 2] & 0xff) << 8) |
        (hmacBytes[offset + 3] & 0xff);

    const step4 = {
        label: 'Bước 4: Dynamic Truncation',
        meta_data: {
            offset: offset,
            truncated_hex: '0x' + truncated.toString(16),
            truncated_decimal: truncated,
        },
        description: `Offset = ${offset}, Giá trị sau truncation = ${truncated}`
    };

    // ========== BƯỚC 5: Tạo mã OTP cuối cùng ==========
    const modulus = 10 ** digits;
    const otpRaw = truncated % modulus;
    const otpStr = otpRaw.toString().padStart(digits, '0');

    const step5 = {
        label: 'Bước 5: Tính OTP cuối cùng',
        meta_data: {
            modulus: modulus,
            raw: truncated,
            otp_final: otpStr,
        },
        description: `${truncated} % ${modulus} = ${otpStr}`
    };

    // ========== KẾT QUẢ ==========
    return {
        otp: otpStr,
        debug_info: [step1, step2, step3, step4, step5]
    };
}

export default function OtpGenerator() {
    const [type, setType] = useState('hotp')
    const [init, setInit] = useState({ "secret": "" })
    const [otp, setOtp] = useState("")
    const [generationSteps, setGenerationSteps] = useState([])
    const [otpStack, setOtpStack] = useState([])
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [totpSlotTime, setTotpSlotTime] = useState(null)
    const [onlyOnce, setOnlyOnce] = useState(true)

    const reset = () => { setOtp(""); setGenerationSteps([]); setOtpStack([]); setTimeRemaining(0); setTotpSlotTime(null); setOnlyOnce(true) }
    const setTypeOtp = (type) => { setType(type); reset(); }

    useEffect(() => {
        async function updateStatus() {
            try {
                const res = await fetch(`${import.meta.env.VITE_SERVER_NAME}/api/init-${type}`);
                const data = await res.json();
                setInit(data.data)
            } catch (e) {
                console.error('Lỗi cập nhật trạng thái:', e);
            }
        }

        updateStatus()
    }, [type])

    const generateTOTPWithDebug = useRef(function (secret, timeStep = 30, digits = 6) {
        // ========== BƯỚC 1: Tính toán thời gian ==========
        const now = Math.floor((new Date()).getTime() / 1000); // Thời gian hiện tại (seconds)
        const counter = Math.floor(now / timeStep);
        const timeElapsed = now % timeStep;
        const timeRemaining = timeStep - timeElapsed;

        const step1 = {
            label: 'Bước 1: Tính toán thời gian',
            meta_data: {
                current_time: now,
                time_step: timeStep,
                counter: counter,
                time_elapsed: timeElapsed,
                time_remaining: timeRemaining,
            },
            description: `Thời gian hiện tại: ${now}s, Counter: ${counter}, Còn lại: ${timeRemaining}s`
        };

        // ========== BƯỚC 2: Chuyển counter thành bytes (big-endian 8 bytes) ==========
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setBigUint64(0, BigInt(counter), false);
        const counterBytes = new Uint8Array(buffer);
        const counterHex = Array.from(counterBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const step2 = {
            label: 'Bước 2: Chuyển counter thành bytes',
            meta_data: {
                counter: counter,
                counter_hex: counterHex,
            },
            description: `Counter = ${counter} → Bytes (big-endian): ${counterHex}`
        };

        // ========== BƯỚC 3: Decode Secret từ Base32 ==========
        const secretBytes = base32Decode(secret);
        const secretHex = Array.from(secretBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const step3 = {
            label: 'Bước 3: Decode Secret Key (Base32)',
            meta_data: {
                secret_base32: secret,
                secret_hex: secretHex,
            },
            description: `Secret "${secret}" → Hex: ${secretHex}`
        };

        // ========== BƯỚC 4: Tính HMAC-SHA1 ==========
        const secretWordArray = CryptoJS.lib.WordArray.create(secretBytes);
        const counterWordArray = CryptoJS.enc.Hex.parse(counterHex);
        const hmac = CryptoJS.HmacSHA1(counterWordArray, secretWordArray);
        const hmacHex = hmac.toString(CryptoJS.enc.Hex);

        const step4 = {
            label: 'Bước 4: Tính HMAC-SHA1',
            meta_data: {
                hmac_hex: hmacHex,
            },
            description: `HMAC-SHA1(Secret, Counter) = ${hmacHex}`
        };

        // ========== BƯỚC 5: Dynamic Truncation ==========
        const hmacBytes = [];
        for (let i = 0; i < hmacHex.length; i += 2) {
            hmacBytes.push(parseInt(hmacHex.substring(i, i + 2), 16));
        }

        const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
        const truncated =
            ((hmacBytes[offset] & 0x7f) << 24) |
            ((hmacBytes[offset + 1] & 0xff) << 16) |
            ((hmacBytes[offset + 2] & 0xff) << 8) |
            (hmacBytes[offset + 3] & 0xff);

        const step5 = {
            label: 'Bước 5: Dynamic Truncation',
            meta_data: {
                offset: offset,
                truncated_hex: '0x' + truncated.toString(16),
                truncated_decimal: truncated,
            },
            description: `Offset = ${offset}, Giá trị sau truncation = ${truncated}`
        };

        // ========== BƯỚC 6: Tạo mã OTP cuối cùng ==========
        const modulus = 10 ** digits;
        const otpRaw = truncated % modulus;
        const otpStr = otpRaw.toString().padStart(digits, '0');

        const step6 = {
            label: 'Bước 6: Tính OTP cuối cùng',
            meta_data: {
                modulus: modulus,
                raw: truncated,
                otp_final: otpStr,
            },
            description: `${truncated} % ${modulus} = ${otpStr}`
        };

        // ========== KẾT QUẢ ==========
        return {
            otp: otpStr,
            timeStep: timeStep,
            slotStartTime: now - timeElapsed,
            debug_info: [step1, step2, step3, step4, step5, step6]
        };
    })

    const updateOtpStack = (otp) => {
        setOtpStack(prev => {
            if (prev.length >= 9) { return [...prev.slice(1), otp] }
            else return [...prev, otp]
        })
    }

    const handleGenerateHOTP = useCallback(() => {
        const res = generateHOTPWithDebug(init.secret, init.counter)
        setOtp(res.otp)
        setGenerationSteps(res.debug_info)
        setInit(prev => ({ ...prev, "counter": prev.counter + 1 }))
        updateOtpStack(res.otp)
    }, [init, otp])

    const handleGenerateTOTP = useCallback(() => {
        const res = generateTOTPWithDebug.current(init.secret, init.step || 30)
        setOtp(res.otp)
        setTotpSlotTime(res.slotStartTime)
        setGenerationSteps(res.debug_info)
        updateOtpStack(res.otp)
    }, [init])

    useEffect(() => {
        if (type !== 'totp' || !init.secret) return;
        if (onlyOnce) { handleGenerateTOTP(); setOnlyOnce(false) }
        let intervalId;
        const startCountdown = () => {
            intervalId = setInterval(() => {
                const now = Math.floor(Date.now() / 1000);
                const timeStep = init.step || 30;
                const slotEndTime = totpSlotTime + timeStep;
                const remaining = slotEndTime - now;

                setTimeRemaining(remaining)
                if (remaining <= 0) {
                    // Slot hết hạn - clear interval ngay để tránh gọi handleGenerateTOTP() nhiều lần
                    clearInterval(intervalId);
                    handleGenerateTOTP();
                }
            }, 1000);
        };

        startCountdown();

        return () => { clearInterval(intervalId); }
    }, [type, otp, init, totpSlotTime])

    return (
        <section className="generate-panel">
            <div className="panel-header">
                <div className="panel-title-block">
                    <p className="kicker">Tab 01 / Sinh OTP</p>
                    <h2>Bên phát hành tạo mật khẩu dùng một lần.</h2>
                </div>
                <div className="flex">
                    <Badge label="HOTP" light={type !== "hotp"} func={() => setTypeOtp("hotp")} />
                    <Badge label="TOTP" light={type !== "totp"} func={() => setTypeOtp("totp")} />
                </div>

            </div>

            <div className="generator-row">
                <div className="otp-card current-otp">
                    <p className="card-label">OTP hiện tại</p>
                    <strong className="code-value">{otp}</strong>
                    {(type === "totp" && !!otp.length) && <div>
                        <p className="code-meta">Hết hạn trong {timeRemaining} giây</p>
                        <div className="countdown-track" aria-hidden="true">
                            <div className="countdown-fill" style={{ width: `${(timeRemaining / init.step) * 100}%` }} />
                        </div>
                    </div>}
                </div>

                <div className="otp-card otp-history">
                    <p className="card-label">Lịch sử mã OTP</p>
                    <div className="otp-stack">
                        {otpStack.map((otp, index) => <span className="otp" key={index}>{otp}</span>)}
                    </div>
                </div>

                <div className="params-card parameters">
                    <p className="card-label">Nguyên liệu mầm</p>
                    <div className="param-row">
                        <span className="param-label">Khóa bí mật</span>
                        <span className="param-value">{init.secret}</span>
                    </div>
                    {init?.step && <div className="param-row">
                        <span className="param-label">Thời gian sống</span>
                        <span className="param-value">{init.step} seconds</span>
                    </div>}
                    {!isNaN(init?.counter) && <div className="param-row">
                        <span className="param-label">Bộ đếm</span>
                        <span className="param-value">{init.counter}</span>
                    </div>}
                    {type === "hotp" && <button className="btn" onClick={handleGenerateHOTP}>Sinh {type.toUpperCase()}</button>}
                </div>
                <Verifier type={type} />
                {type === "hotp" && <Resync />}
            </div>

            <div className="flow">
                <p className="flow-title">Các bước tổng quan</p>
                <div className="flow-row">
                    {generationSteps.map(({ label, description, meta_data }) => (
                        <StepCard key={label} label={label} description={description} meta_data={meta_data} />
                    ))}
                </div>
            </div>
        </section>
    )
}