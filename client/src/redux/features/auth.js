import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api"

const initialState = {
    "user": null,
    "accessToken": null,
    "error": null,
    "success": false,
    "authLoading": false
}

export const login = createAsyncThunk(
    'auth/login',
    async (data, { rejectWithValue }) => {
        try {
            const response = await api("/login", {
                "method": "POST",
                "body": JSON.stringify(data)
            })

            return response
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
            const response = await api("/logout-force", {
                "method": "POST",
                "body": JSON.stringify(data)
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
            .addCase(login.pending, (state) => {
                state.error = null
                state.authLoading = true
            })
            .addCase(login.fulfilled, (state, action) => {
                state.authLoading = false
                state.success = true
                state.user = action.payload.user
                state.accessToken = action.payload.access_token
            })
            .addCase(login.rejected, (state, action) => {
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