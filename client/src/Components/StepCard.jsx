export default function StepCard({ label, description, meta_data }) {
    return (
        <article className="step-card">
            <strong className="step-label">{label}</strong>
            {Object.entries(meta_data).map(([key, value], index) => {
                return <p className="step-meta" key={index}>{key.toUpperCase()}:&nbsp;&nbsp;{value}</p>
            })}
            <p className="step-description">{description}</p>
        </article>
    );
}