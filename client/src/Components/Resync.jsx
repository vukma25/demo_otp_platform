import { useState } from "react"

export default function Resync() {
    const [otps, setOtps] = useState({ "otp1": "", "otp2": "", "otp3": "" })
    const [loading, setLoading] = useState(false)
    const [resync, setResync] = useState({ "success": false, "message": "" })

    const checkValidateOtp = (otp) => {
        return /^\d+$/.test(otp);
    }
    const handleResync = async () => {
        if (Object.entries(otps).some(([_, otp]) => otp.length !== 6)) { console.log("Độ dài yêu cầu các mã OTP là 6 chữ số"); return; }
        if (Object.entries(otps).some(([_, otp]) => !checkValidateOtp(otp))) { console.log("Yêu cầu các mã OTP chỉ gồm chứ số"); return; }

        setLoading(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_NAME}/api/otp/resync`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ "otps": Object.entries(otps).map(([_, value]) => value) }),
            });
            const data = await res.json();
            setResync(data)
        } catch (e) {
            console.error('Lỗi cập nhật trạng thái:', e);
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="otp-card resync">
            <p className="card-label">Resync counter</p>
            <div className="verify-hotp">
                <input
                    type="text" className="otp-resync"
                    onChange={(e) => setOtps(prev => ({ ...prev, "otp1": e.target.value }))} />
                -<input
                    type="text" className="otp-resync"
                    onChange={(e) => setOtps(prev => ({ ...prev, "otp2": e.target.value }))} />
                -<input
                    type="text" className="otp-resync"
                    onChange={(e) => setOtps(prev => ({ ...prev, "otp3": e.target.value }))} />
                <button className="btn btn-verify" onClick={handleResync}>Tái đồng bộ</button>
            </div>
            <div className={`log ${resync.success ? "success" : "fail"}`}>{loading ? "Đang đồng bộ..." : resync.message}</div>
        </div>
    )
}