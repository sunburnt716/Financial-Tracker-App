import "./App.css";
import Navbar from "./components/navbar"; // note capitalization consistency
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import AccountPage from "./pages/Account"; // import the new account page
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function App() {
  // One global QueryClient for the whole app
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />{" "}
          {/* default landing page */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/account" element={<AccountPage />} />{" "}
          {/* new universal account page */}
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
