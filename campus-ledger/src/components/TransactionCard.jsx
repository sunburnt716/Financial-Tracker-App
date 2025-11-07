import "../App.css";
function TransactionCard({name, price, date, onDelete}){
    let textColor = "red";
    if (price < 0) {
        textColor = "red";
    } else if (price > 0) {
        textColor = "green"
    };
    return (
        <div className = "transactionCards">
            <h4>{name}</h4>
            <p>Amount: ${price}</p>
            <p>Transaction Date: {date}</p>
            <button className = "transaction-button" onClick = {onDelete}>Remove</button>
        </div>
    )
}

export default TransactionCard;