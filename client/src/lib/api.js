import { store } from "../redux/app/store";
import { setAccessToken, logoutForce } from "../redux/features/auth";

// Biến quản lý refresh token (tránh gọi nhiều lần)
let isRefreshing = false;
let failedQueue = [];
let MAX_RETRY = 3;

// Hàm xử lý hàng đợi
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Hàm gọi API refresh token
const callRefreshToken = async (retryCount = 0) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_SERVER_NAME}/refresh`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Làm mới token thất bại');
        const data = await response.json();
        const newAccessToken = data.access_token;
        store.dispatch(setAccessToken(newAccessToken));
        return newAccessToken;
    } catch (error) {
        if (retryCount < MAX_RETRY - 1) {
            // Chờ 1 giây rồi thử lại
            await new Promise(resolve => setTimeout(resolve, 1000));
            return callRefreshToken(retryCount + 1);
        } else {
            // Hết số lần retry -> logout
            const user_id = store.getState().auth.user.user_id
            store.dispatch(logoutForce({ "id": user_id }));
            throw error;
        }
    }
};

/**
 * Hàm fetch chính, tự động xử lý refresh token khi gặp 401
 * @param {string} endpoint - đường dẫn tương đối hoặc tuyệt đối
 * @param {object} options - các options của fetch (method, body, headers...)
 * @returns {Promise<Response>}
 */
const api = async (endpoint, options = {}) => {
    // Lấy access token hiện tại từ Redux
    const state = store.getState();
    let accessToken = state.auth.accessToken;

    // Chuẩn bị headers mặc định
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Clone options để tránh thay đổi đối tượng gốc
    const fetchOptions = {
        ...options,
        headers,
        credentials: 'include', // luôn gửi cookie (chứa refresh token)
    };

    // Lưu lại endpoint và options để retry nếu cần
    const originalRequest = { endpoint, options: fetchOptions };

    let response = await fetch(`${import.meta.env.VITE_SERVER_NAME}${endpoint}`, fetchOptions);

    // Nếu lỗi 401 và chưa phải là request refresh (tránh vòng lặp)
    if (response.status === 401 && !endpoint.includes('/refresh')) {
        if (!isRefreshing) {
            isRefreshing = true;
            try {
                const newToken = await callRefreshToken();
                processQueue(null, newToken);
                // Retry request ban đầu với token mới
                const retryHeaders = {
                    ...originalRequest.options.headers,
                    'Authorization': `Bearer ${newToken}`,
                };
                const retryOptions = {
                    ...originalRequest.options,
                    headers: retryHeaders,
                };
                response = await fetch(originalRequest.endpoint, retryOptions);
                return response;
            } catch (err) {
                processQueue(err, null);
                throw err;
            } finally {
                isRefreshing = false;
            }
        } else {
            // Đang có refresh, thêm request hiện tại vào queue
            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: (newToken) => {
                        const retryHeaders = {
                            ...originalRequest.options.headers,
                            'Authorization': `Bearer ${newToken}`,
                        };
                        const retryOptions = {
                            ...originalRequest.options,
                            headers: retryHeaders,
                        };
                        fetch(originalRequest.endpoint, retryOptions).then(resolve).catch(reject);
                    },
                    reject,
                });
            });
        }
    }
    return await response.json();
};

export default api;