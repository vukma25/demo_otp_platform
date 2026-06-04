import { useState } from "react"
import api from "../lib/api"
import Field from "./Field"
import { checkValidateOtp } from "../utilities/validator"

export default function Modal() {
    const [pairPassword, setPairPassword] = useState({
        "password": "", "confirm": ""
    })
    const [otp, setOtp] = useState("")

    const handleChangePassword = (e) => {
        setPairPassword(prev => ({ ...prev, password: e.target.value }))
    }
    const handleConfirmPassword = (e) => {
        setPairPassword(prev => ({ ...prev, confirm: e.target.value }))
    }
    const handleChangeOtp = (e) => {
        setOtp(e.target.value)
    }

    const handleResetPassword = async () => {
        if (!pairPassword.password || !pairPassword.confirm || !checkValidateOtp(otp)) return
        if (pairPassword.password !== pairPassword.confirm) return

        try {
            const response = await api("/reset-password", {
                method: "POST",
                body: JSON.stringify({ new_password: pairPassword.password, otp: otp })
            })

            await response.json()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div>
            <Field type={"password"} label={"Mật khẩu mới"} value={pairPassword.password} func={handleChangePassword} />
            <Field type={"password"} label={"Xác nhận mật khẩu"} value={pairPassword.confirm} func={handleConfirmPassword} />
            <Field label={"Mã OTP"} value={otp} func={handleChangeOtp} />
            <button onClick={handleResetPassword}>Gửi</button>
        </div>
    )
}