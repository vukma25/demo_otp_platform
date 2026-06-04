function pad6(num) {
    return String(num).padStart(6, "0");
}

function buildFakeRequestLog(path, status) {
    const timestamp = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).format(new Date());

    return `[${timestamp}] POST ${path} HTTP/1.1" ${status}`;
}

self.onmessage = (event) => {
    const { type, targetOtp } = event.data;
    if (type !== "start") {
        return;
    }

    const normalizedTarget = pad6(Number(targetOtp));
    const maxAttempts = 1000000;

    for (let i = 0; i < maxAttempts; i += 1) {
        const attempt = pad6(i);
        const status = attempt === normalizedTarget ? 200 : 401;
        const logText = buildFakeRequestLog("/verify-otp", status);

        if (i % 10000 === 0 || status === 200) {
            self.postMessage({
                type: "update",
                log: { text: logText, status },
                attempts: i + 1
            });
        }

        if (status === 200) {
            self.postMessage({
                type: "done",
                success: true,
                attempts: i + 1,
                log: { text: logText, status }
            });
            return;
        }
    }

    self.postMessage({
        type: "done",
        success: false,
        attempts: maxAttempts,
        log: { text: "Hoàn thành brute-force sau 1.000.000 lần thử nhưng không tìm thấy mã.", status: 500 }
    });
};
