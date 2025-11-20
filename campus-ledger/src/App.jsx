import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import TransactionCard from "./components/TransactionCard";
import Navbar from "./components/navbar";
import Dashboard from "./pages/dashboard";
import About from "./pages/about";
import Transactions from "./pages/Transactions";
import Contact from "./pages/contact";
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function App() {
  const [transactions, setTransactions] = useState([]);

  const queryClient = new QueryClient();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("transactions"));
    if (saved) setTransactions(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <Router>
          <Navbar />
          <Routes>
            <Route
              path="/Dashboard"
              element={<Dashboard transactions={transactions} />}
            />
            <Route
              path="/Transactions"
              element={
                <Transactions
                  transactions={transactions}
                  setTransactions={setTransactions}
                />
              }
            />
            <Route path="/About" element={<About />} />
            <Route path="/Contact" element={<Contact />} />
          </Routes>
        </Router>
      </div>
    </QueryClientProvider>
  );
}

export default App;
