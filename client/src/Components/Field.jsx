export default function Field({ type = "text", label, value, status, func, disable }) {
    return (
        <label className="input-field">
            <span className="input-label">{label}</span>
            <span className="input-box">
                <input
                    className="input-control"
                    type={type}
                    value={value}
                    onChange={(e) => func(e)}
                    disabled={disable}
                />
            </span>
            <span className="input-status">{status}</span>
        </label>
    );
}