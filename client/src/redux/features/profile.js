import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api";

const initialState = {
    profile: null,
    qrCode: null,
    profileLoading: false,
    actionLoading: false,
    message: null,
    error: null,
};

export const fetchProfile = createAsyncThunk(
    "profile/fetch",
    async (_, { rejectWithValue }) => {
        try {
            return await api("/profile", { method: "GET" });
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const fetchQrCode = createAsyncThunk(
    "profile/fetch-qr-code",
    async (_, { rejectWithValue }) => {
        try {
            return await api("/get-qrcode-totp", { method: "GET" });
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const activateTotp = createAsyncThunk(
    "profile/activate-totp",
    async (otp, { rejectWithValue }) => {
        try {
            return await api("/active-totp", {
                method: "POST",
                body: JSON.stringify({ otp }),
            });
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const resetPassword = createAsyncThunk(
    "profile/reset-password",
    async (data, { rejectWithValue }) => {
        try {
            return await api("/reset-password", {
                method: "POST",
                body: JSON.stringify(data),
            });
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

const profileSlice = createSlice({
    name: "profile",
    initialState,
    reducers: {
        clearProfileState(state) {
            state.profile = null;
            state.qrCode = null;
            state.profileLoading = false;
            state.actionLoading = false;
            state.message = null;
            state.error = null;
        },
    },
    extraReducers: (builder) =>
        builder
            .addCase(fetchProfile.pending, (state) => {
                state.profileLoading = true;
                state.error = null;
                state.message = null;
            })
            .addCase(fetchProfile.fulfilled, (state, action) => {
                state.profileLoading = false;
                if (action.payload?.profile) {
                    state.profile = action.payload.profile;
                } else {
                    state.error = action.payload?.message || "Không thể lấy thông tin hồ sơ";
                    state.profile = null;
                }
            })
            .addCase(fetchProfile.rejected, (state, action) => {
                state.profileLoading = false;
                state.error = action.payload?.message || action.payload || "Lỗi tải hồ sơ";
            })
            .addCase(fetchQrCode.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.message = null;
            })
            .addCase(fetchQrCode.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.qrCode = action.payload?.qr_code || null;
                state.message = action.payload?.message || null;
                if (!action.payload?.qr_code && action.payload?.message) {
                    state.error = action.payload.message;
                }
            })
            .addCase(fetchQrCode.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload?.message || action.payload || "Lỗi lấy mã QR";
            })
            .addCase(activateTotp.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.message = null;
            })
            .addCase(activateTotp.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.message = action.payload?.message || null;
                if (action.payload?.message?.toLowerCase().includes("thành công") && state.profile) {
                    state.profile.totp_enable = 1;
                }
            })
            .addCase(activateTotp.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload?.message || action.payload || "Lỗi kích hoạt TOTP";
            })
            .addCase(resetPassword.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.message = null;
            })
            .addCase(resetPassword.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.message = action.payload?.message || null;
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload?.message || action.payload || "Lỗi đổi mật khẩu";
            }),
});

export const { clearProfileState } = profileSlice.actions;
export default profileSlice.reducer;
