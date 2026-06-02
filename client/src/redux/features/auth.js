import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api"

const initialState = {
    "user": null,
    "accessToken": null,
    "error": null,
    "success": false,
    "authLoading": false
}

export const loginCompleted = createAsyncThunk(
    'auth/login-completed',
    async (data, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/login-completed`, {
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

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api("/logout", {
                "method": "POST"
            })
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const logoutForce = createAsyncThunk(
    'auth/logout-force',
    async (data, { rejectWithValue }) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/logout-force`, {
                "method": "POST",
                "headers": { "Content-Type": "application/json" },
                "body": JSON.stringify(data),
                "credentials": "include"
            })
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);


const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAccessToken(state, action) {
            state.accessToken = action.payload
        },
        setSuccess(state) {
            state.success = false
        }
    },
    extraReducers: (builder) =>
        builder
            .addCase(loginCompleted.pending, (state) => {
                state.error = null
                state.authLoading = true
            })
            .addCase(loginCompleted.fulfilled, (state, action) => {
                state.authLoading = false
                state.success = true
                state.user = action.payload.user
                state.accessToken = action.payload.access_token
            })
            .addCase(loginCompleted.rejected, (state, action) => {
                state.authLoading = false
                state.error = action.payload
            })
            .addCase(logout.pending, (state) => {
                state.authLoading = true
            })
            .addCase(logout.fulfilled, (state) => {
                state.authLoading = false
                state.user = null
                state.accessToken = null
            })
            .addCase(logout.rejected, (state, action) => {
                state.authLoading = false
                state.error = action.payload
            })
            .addCase(logoutForce.fulfilled, (state) => {
                state.authLoading = false
                state.user = null
                state.accessToken = null
            })
})

export const { setAccessToken, setSuccess } = authSlice.actions
export default authSlice.reducer