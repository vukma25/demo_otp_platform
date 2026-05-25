import Badge from "./Badge";
import MiniStep from "./MiniStep";

export default function CompactPanel({ kicker, title, badge, steps, metaLeft, metaRight }) {
    return (
        <section className="compact-panel">
            <div className="panel-header">
                <div className="panel-title-block">
                    <p className="compact-kicker">{kicker}</p>
                    <h3>{title}</h3>
                </div>
                <Badge label={badge} light />
            </div>
            <div className="compact-flow">
                {steps.map(([number, label]) => (
                    <MiniStep key={number} number={number} label={label} />
                ))}
            </div>
            <div className="meta-row">
                <span>{metaLeft}</span>
                <strong>{metaRight}</strong>
            </div>
        </section>
    );
}