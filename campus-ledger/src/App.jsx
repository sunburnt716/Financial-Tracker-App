import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TransactionCard from './components/TransactionCard'; //check components file
import Navbar from "./components/navbar";
import Dashboard from './pages/dashboard';
import About from "./pages/about";
import Transactions from "./pages/transactions";
import Contact from "./pages/contact";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function App() {
  return(
    <div>
      <Router>
        <Navbar />
        <Routes>
          <Route path = "/Dashboard" element = {<Dashboard />} />
          <Route path = "/Transactions" element = {<Transactions />} />
          <Route path = "/About" element = {<About />} />
          <Route path = "/Contact" element = {<Contact />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
