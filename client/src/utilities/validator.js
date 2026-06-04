export const checkValidateOtp = (otpVerifier) => {
    return /^\d+$/.test(otpVerifier) && otpVerifier.length === 6;
}