export default function Field({ type = "text", label, value, status, func, disable }) {
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            <span className="field-box">
                <input type={type} value={value} onChange={(e) => func(e)} disabled={disable} />
            </span>
            <span className="field-status">{status}</span>
        </label>
    );
}