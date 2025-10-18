function TransactionCard({name, price, date}){
    let textColor = "red";
    if (price < 0) {
        textColor = "red";
    } else if (price > 0) {
        textColor = "green"
    };
    return (
        <div style={{
            border: '1px solid',
            borderColor: textColor,
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '8px',
            width: '300px',
        }}>
            <h4>{name}</h4>
            <p>Amount: ${price}</p>
            <p>Transaction Date: {date}</p>
        </div>
    )
}

export default TransactionCard;