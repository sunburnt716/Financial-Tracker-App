import "../App.css";

function TransactionCard({ name, price, date, onDelete, onUpdate }) {
  const textColor = price < 0 ? "red" : "green";

  return (
    <div className="transactionCards">
      <h4>{name}</h4>
      <p>Amount: ${price}</p>
      <p>Transaction Date: {date}</p>

      <div className="transaction-card-buttons">
        <button className="transaction-button" onClick={onUpdate}>
          Edit
        </button>
        <button className="transaction-button" onClick={onDelete}>
          Remove
        </button>
      </div>
    </div>
  );
}

export default TransactionCard;
