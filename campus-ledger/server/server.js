import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import transactionsRouter from "./routes/transactions.js";

dotenv.config();

const app = express();

app.use(cors()); //allows external requests from the frontend to backend
app.use(morgan("dev")); //logs requests in console
app.use(express.json()); //parses incoming JSON bodies to access data with "req.body"

app.get("/", (req, res) => res.send("Server is running")); //Root route for testing

app.use("/api/transactions", transactionsRouter); //connects transactions router to server

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
