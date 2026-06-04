import { createSlice } from "@reduxjs/toolkit";
import { io } from 'socket.io-client'


const initialState = {
    socket: null,
}

const socketSlice = createSlice({
    name: "socket",
    initialState,
    reducers: {
        connectSocket: (state, action) => {
            if (state.socket) return
            const serverUrl = import.meta.env.VITE_SERVER_NAME || window.location.origin;
            const socket = io(serverUrl, {
                transports: ["websocket"],
                autoConnect: true,
            });

            state.socket = socket
        },
        disconnectSocket: (state) => {
            if (state.socket) {
                state.socket.disconnect()
                state.socket = null
                console.log("Disconnected")
            }
        }
    }
})

export const { connectSocket, disconnectSocket } = socketSlice.actions
export default socketSlice.reducer