import mongoose from "mongoose";
import Transactions from "./transactions.js"; // make sure the file name matches your model file
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  "mongodb+srv://swayampharate_db_user:hedR2Riv3Kjm79gH@financialappcluster.qzafp9z.mongodb.net/?appName=FinancialAppCluster";

const clearTransactions = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Atlas");

    const result = await Transactions.deleteMany({});
    console.log(`Deleted ${result.deletedCount} transactions`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB Atlas");
  } catch (err) {
    console.error(err);
  }
};

clearTransactions();
