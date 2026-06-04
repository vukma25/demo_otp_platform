import { useEffect } from "react";
import { Routes, Route } from "react-router";
import Home from "./Pages/Home";
import Register from "./Pages/Register";
import Login from "./Pages/Login";
import Profile from "./Pages/Profile";
import Attack from "./Pages/Attack";
import { initSocket } from "./socket";
import { connectSocket, disconnectSocket } from "./redux/features/socket";
import { useDispatch } from "react-redux";

export default function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(connectSocket())
    initSocket()

    return () => dispatch(disconnectSocket())
  }, [])

  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/attack" element={<Attack />} />
    </Routes>
  );
}