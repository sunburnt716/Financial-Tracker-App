import "./App.css";
import Navbar from "./components/navbar";
import Dashboard from "./pages/dashboard";
import About from "./pages/about";
import Transactions from "./pages/Transactions";
import Contact from "./pages/contact";
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
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/Transactions" element={<Transactions />} />
          <Route path="/About" element={<About />} />
          <Route path="/Contact" element={<Contact />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
