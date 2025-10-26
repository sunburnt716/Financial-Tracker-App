import { useState } from "react";
import {Link } from "react-router-dom";
import "../App.css";

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);


return (
    <nav>
        <h1 className = "logo">FinanceApp</h1>

        <div className = {`nav-links ${menuOpen ? "active" : ""}`}>
            <Link to = "/dashboard">Dashboard</Link>
            <Link to = "/transactions">Transactions</Link>
            <Link to = "/about">About</Link>
            <Link to = "/contact">Contact</Link>
        </div>

        <div className = "menu-toggle" onClick = {() => setMenuOpen(!menuOpen)}>
            <div className = "bar"></div>
            <div className = "bar"></div>
            <div className = "bar"></div>
        </div>
    </nav>
)
}