import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TransactionCard from './components/TransactionCard'; //check components file

function App() {
  const [transactions, setTransactions] = useState([]); //useState to gain necessary info for TransactionCard
  const [name, setName] = useState(''); //useState to get name of transaction
  const [price, setPrice] = useState(''); //useState to get price of transaction
  const [date, setDate] = useState(''); //useState to get date of transaction

  const handleSubmit = (e) => {
    e.preventDefault(); //ensures that data about transactions don't get lost
    const newTransaction = {name, price, date};
    setTransactions([...transactions, newTransaction]);//creates new transactionCard index
    //resets all transaction card elements
    setName('');
    setPrice('');
    setDate('');
  };
  
  return(
    <div>
      <h2>Transactions</h2>
      <form onSubmit = {handleSubmit}>
        <label htmlFor = "transactionName">Enter transaction name:</label>
        <input
          id = "transactionName"
          type = "name"
          value = {name}
          onChange = {(e) => setName(e.target.value)} //obtains name from transactionName input
        />
        <br/>
        <label htmlFor = "transactionAmount">Enter transaction amount:</label>
        <input
          id = "transactionAmount"
          type = "number"
          value = {price}
          onChange = {(e) => setPrice(e.target.value)} //obtains number from transactionAmount input
          />
        <br/>
        <label htmlFor = "transactionDate">Enter date of transaction:</label>
        <input
          id = "transactionDate"
          type = "date"
          value = {date}
          onChange = {(e) => setDate(e.target.value)}//obtains date from transactionDate input
          />
        <br/>
        <button type = "submit">Submit Transaction</button>
      </form>

      <h2>All Transactions</h2>
      {transactions.map((t, index) => (
        <TransactionCard
        key = {index}
        name = {t.name}
        price = {t.price}
        date = {t.date}
        />
      ))} //edits components of transactionCard
    </div>
  );
}

export default App
