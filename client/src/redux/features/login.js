import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api"

const initialState = {
    "data": {
        "login": null,
        "resend": null
    },
    "error": null,
    "loginLoading": false
}

export const preLogin = createAsyncThunk(
    "login",
    async (data, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/login`, {
                "method": "POST",
                "headers": { "Content-Type": "application/json" },
                "body": JSON.stringify(data),
                "credentials": "include"
            })

            if (response.status !== 200) {
                throw new Error("Thông tin không hợp lệ")
            }

            const result = await response.json()
            return result
        } catch (error) {
            return rejectWithValue(error)
        }
    }
)

export const resendEmailLogin = createAsyncThunk(
    "login/resend-email",
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/resend-otp-email-login`, {
                "method": "POST",
                "credentials": "include"
            })

            const result = await response.json()
            return result
        } catch (error) {
            return rejectWithValue(error)
        }
    }
)

export const remainStateLogin = createAsyncThunk(
    "login/remain-state",
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/login-state`, {
                "method": "GET",
                "credentials": "include"
            })

            const result = await response.json()
            return result
        } catch (error) {
            return rejectWithValue(error)
        }
    }
)

const loginSlice = createSlice({
    name: "login",
    initialState,
    reducers: {
        clear(state) {
            state.data = {
                "login": null,
                "resend": null
            }
            state.error = null
            state.loginLoading = false
        }
    },
    extraReducers: (builder) =>
        builder
            .addCase(preLogin.pending, (state) => {
                state.loginLoading = true
            })
            .addCase(preLogin.fulfilled, (state, action) => {
                state.loginLoading = false
                state.data.login = action.payload
            })
            .addCase(preLogin.rejected, (state, action) => {
                state.loginLoading = false
                state.error = action.payload
            })
            .addCase(resendEmailLogin.pending, (state) => {
                state.loginLoading = true
            })
            .addCase(resendEmailLogin.fulfilled, (state, action) => {
                state.loginLoading = false
                state.data.resend = action.payload
            })
            .addCase(resendEmailLogin.rejected, (state, action) => {
                state.loginLoading = false
                state.error = action.payload
            })
            .addCase(remainStateLogin.pending, (state) => {
                state.loginLoading = true
            })
            .addCase(remainStateLogin.fulfilled, (state, action) => {
                state.loginLoading = false

                const { message, email, otp_type, resend_after } = action.payload
                if (message && email && otp_type && !isNaN(resend_after)) {
                    state.data.login = { message, email, otp_type }
                    state.data.resend = { message, resend_after }
                }

            })
            .addCase(remainStateLogin.rejected, (state, action) => {
                state.loginLoading = false
                state.error = action.payload
            })
})

export const { clear } = loginSlice.actions
export default loginSlice.reducer