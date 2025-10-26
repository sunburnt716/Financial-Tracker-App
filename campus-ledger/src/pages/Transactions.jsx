import { useState } from "react";
import TransactionCard from "../components/TransactionCard";
import "../App.css";

export default function Transactions() {
  const [threshold, setThreshold] = useState(0);
  const [total, setTotal] = useState(0);
  const [transactions, setTransactions] = useState([]); 
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [tFormVisibility, setTFormVisibility] = useState(false);
  const [showAbove, setShowAbove] = useState(false);
  const [showThresholdForm, setShowThresholdForm] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(0);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

const handleSubmit = (e) => {
    e.preventDefault();
    const newTransaction = { name, price: Number(price), date };
    setTransactions([...transactions, newTransaction]);
    setName('');
    setPrice('');
    setDate('');
  };

  const handleDelete = (deleteIndex) => {
    setTransactions(transactions.filter((_, index) => index !== deleteIndex));
  };

  const handleThreshold = (threshold, showAbove) => {
    setThreshold(transactions.filter(t => {
      if (showAbove === true) {
        return t.price > threshold;
      } else {
        return t.price < threshold;
      }
    }));
  };

  return (
    <div>
      <h2>Transactions</h2>
      <form className = "transaction-form" onSubmit={handleSubmit}>
        <label htmlFor="transactionName">Enter transaction name:</label>
        <input
          id="transactionName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br />
        <label htmlFor="transactionAmount">Enter transaction amount:</label>
        <input
          id="transactionAmount"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <br />
        <label htmlFor="transactionDate">Enter date of transaction:</label>
        <input
          id="transactionDate"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <br />
        <button className = "transaction-button" type="submit">Submit Transaction</button>
      </form>

      <button className = "transaction-button" onClick = {() => setShowThresholdForm(true)}>Set Threshold</button>
      
      {showThresholdForm && (
        <form className = "transaction-form" onSubmit = {handleThresholdSubmit}>
          <label>
            Threshold Amount:
            <input
              type = "number"
              value = {thresholdValue}
              className = "transaction-input"
              onChange = {(e) => setThresholdValue(Number(e.target.value))}
            />
          </label>
          
          <label>
            Show Above or Below?
            <select
              value = {showAbove ? "above" : "below"}
              onChange = {(e) => setShowAbove(e.target.value === "above")}
              className = "transaction-select"
            >
              <option value = "above">Above</option>
              <option value = "below">Below</option>
            </select>
          </label>

          <button type = "submit">Apply Filter</button>
        </form>
      )}

      <h2>All Transactions</h2>
      {transactions.map((t, index) => (
        <TransactionCard
          key={index}
          name={t.name}
          price={t.price}
          date={t.date}
        />
      ))}
    </div>
  );
}