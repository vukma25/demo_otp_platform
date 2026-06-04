import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { checkValidateOtp } from "../utilities/validator"

export default function Verifier({ type = "hotp" }) {
    const { socket } = useSelector((state) => state.socket)

    const [otpVerifier, setOtpVerifier] = useState("")
    const [loading, setLoading] = useState(false)
    const [verify, setVerify] = useState({ "success": false, "message": "" })

    const getSocketHeaders = () => {
        const socketId = socket?.id;
        return socketId ? { "X-Socket-ID": socketId } : {};
    };

    useEffect(() => { setOtpVerifier("") }, [type])
    useEffect(() => {
        let timeOut = null;
        if (verify.message.length !== 0) {
            timeOut = setTimeout(() => { setVerify({ "success": false, "message": "" }) }, 1500)
        }

        return () => { if (timeOut) clearTimeout(timeOut); }
    }, [verify.message]);

    const handleVerifyOtp = async () => {
        if (otpVerifier.length !== 6) { console.log("Độ dài yêu cầu là 6 chữ số"); return; }
        if (!checkValidateOtp(otpVerifier)) { console.log("Yêu cầu mã OTP chỉ gồm chứ số"); return; }

        setLoading(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_NAME}/api/otp/verify-${type}`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    ...getSocketHeaders()
                },
                body: JSON.stringify({ "otp": otpVerifier }),
            });
            const data = await res.json();
            setVerify(data)
        } catch (e) {
            console.error('Lỗi cập nhật trạng thái:', e);
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="otp-card verify">
            <p className="card-label">Verify {type.toUpperCase()}</p>
            <div className="verify-hotp">
                <input
                    type="text" className="otp-input"
                    onChange={(e) => setOtpVerifier(e.target.value)} />
                <button className="btn btn-verify" onClick={handleVerifyOtp}>Xác thực</button>
            </div>
            <div className={`log ${verify.success ? "success" : "fail"}`}>{loading ? "Đang xác thực..." : verify.message}</div>
        </div>
    )
}