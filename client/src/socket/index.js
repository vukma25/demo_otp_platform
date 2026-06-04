import { store } from "../redux/app/store";

export const initSocket = () => {
    const { socket } = store.getState().socket;

    socket.on("connect", () => {
        console.log("Connected")
    })
}