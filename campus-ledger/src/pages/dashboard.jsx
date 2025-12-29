import "../App.css";
import StatsCard from "../components/StatsCard.jsx";
import Transactions from "./Transactions.jsx";

export default function Dashboard({ transactions = [] }) {
  // Calculate total revenue (negative prices)
  const totalRevenue = transactions
    .filter((t) => t.price < 0)
    .reduce((sum, t) => sum + t.price, 0);

  // Calculate total expenses (positive prices)
  const totalExpense = transactions
    .filter((t) => t.price > 0)
    .reduce((sum, t) => sum + t.price, 0);

  // Calculate revenue growth as percentage
  // Prevent division by zero
  const revenueGrowth =
    totalExpense !== 0
      ? ((Math.abs(totalRevenue) - totalExpense) / totalExpense) * 100
      : null;

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Hello User!</h1>
      </div>

      {/* Stats Row */}
      <div className="dashboard-stats-row">
        <StatsCard
          title="Total Expenses"
          value={`$${totalExpense.toFixed(2)}`}
          percentageChange={12.4}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${Math.abs(totalRevenue).toFixed(2)}`}
        />
        <StatsCard
          title="Revenue Growth"
          value={
            revenueGrowth !== null ? `${revenueGrowth.toFixed(1)}%` : "+8%"
          }
        />
      </div>

      {/* Charts Placeholder */}
      <div className="dashboard-charts">
        <div className="chart-placeholder">Charts will go here</div>
      </div>
    </div>
  );
}
