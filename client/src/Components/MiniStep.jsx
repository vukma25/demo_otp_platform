export default function MiniStep({ number, label }) {
    return (
        <div className="mini-step">
            <strong>{number}</strong>
            <span>{label}</span>
        </div>
    );
}