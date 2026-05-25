export default function Badge({ label, light = false, func = () => { } }) {
    return (
        <div
            className={light ? "badge light" : "badge"}
            onClick={func}>
            <span>{label}</span>
        </div>
    );
}