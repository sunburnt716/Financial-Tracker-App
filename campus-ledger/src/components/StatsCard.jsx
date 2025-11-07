import "../App.css";

export default function StatsCard({ title, value, percentageChange, color }) {
    let changeElement = null;
    if (percentageChange) {
        changeElement = <p>Change: {percentageChange}</p>;
    }

    return (
        <div className="stats-card" style={{ color: color || "#957C62" }}>
            <h3>{title}</h3>
            <h2>{value}</h2>
            {changeElement} {/* <-- render the element here */}
        </div>
    );
}
