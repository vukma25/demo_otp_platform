import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api"

const initialState = {
    "data": {
        "submit": null,
        "verify": null,
        "resend": null,
        "active": null
    },
    "step": 0,
    "success": false,
    "error": null,
    "regLoading": false
}

export const submitFormData = createAsyncThunk(
    'register',
    async (form, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/register`, {
                "method": "POST",
                "body": form,
                "credentials": "include"
            })

            const result = await response.json()
            return result
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const verifyEmail = createAsyncThunk(
    'register/verify-email',
    async (data, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/verify-email`, {
                "method": "POST",
                "headers": { "Content-Type": "application/json" },
                "body": JSON.stringify(data),
                "credentials": "include"
            })

            const result = await response.json()
            return result
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const resendVerifyEmail = createAsyncThunk(
    'register/resend-email',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/resend-verify-email`, {
                "method": "POST",
                "headers": { "Content-Type": "application/json" },
                "body": JSON.stringify({}),
                "credentials": "include"
            })

            const result = await response.json()
            return result
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const activate2FA = createAsyncThunk(
    'register/active-2fa',
    async (data, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/enable-totp`, {
                "method": "POST",
                "headers": { "Content-Type": "application/json" },
                "body": JSON.stringify(data),
            })

            const result = await response.json()
            return result
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const remainState = createAsyncThunk(
    'register/remain',
    async (data, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/register-state`, {
                "method": "GET",
                "credentials": "include"
            })

            const result = await response.json()
            return result
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);


const regSlice = createSlice({
    name: "reg",
    initialState,
    reducers: {
        clear(state) {
            state = initialState
        },
        setStep(state, action) {
            state.step = action.payload
        }
    },
    extraReducers: (builder) =>
        builder
            .addCase(submitFormData.pending, (state) => {
                state.regLoading = true
            })
            .addCase(submitFormData.fulfilled, (state, action) => {
                state.regLoading = false
                state.data.submit = action.payload
                state.step = 1
            })
            .addCase(submitFormData.rejected, (state, action) => {
                state.regLoading = false
                state.error = action.payload
            })
            .addCase(verifyEmail.pending, (state) => {
                state.regLoading = true
            })
            .addCase(verifyEmail.fulfilled, (state, action) => {
                state.regLoading = false
                state.data.verify = action.payload
                if (action.payload?.qr_code) {
                    state.step = 2
                }
            })
            .addCase(verifyEmail.rejected, (state, action) => {
                state.regLoading = false
                state.error = action.payload
            })
            .addCase(resendVerifyEmail.pending, (state) => {
                state.regLoading = true
            })
            .addCase(resendVerifyEmail.fulfilled, (state, action) => {
                state.regLoading = false
                state.data.resend = action.payload
            })
            .addCase(resendVerifyEmail.rejected, (state, action) => {
                state.regLoading = false
                state.error = action.payload
            })
            .addCase(activate2FA.pending, (state) => {
                state.regLoading = true
            })
            .addCase(activate2FA.fulfilled, (state, action) => {
                state.regLoading = false
                state.data.active = action.payload
                if (action.payload?.message?.includes("thành công")) {
                    state.success = true
                }
            })
            .addCase(activate2FA.rejected, (state, action) => {
                state.regLoading = false
                state.error = action.payload

            })
            .addCase(remainState.pending, (state) => {
                state.regLoading = true
            })
            .addCase(remainState.fulfilled, (state, action) => {
                state.regLoading = false
                state.data.resend = action.payload
                if (!isNaN(action.payload?.resend_after)) {
                    state.step = 1
                }
            })
            .addCase(remainState.rejected, (state, action) => {
                state.regLoading = false
                state.error = action.payload

            })
})

export const { clear, setStep } = regSlice.actions
export default regSlice.reducer