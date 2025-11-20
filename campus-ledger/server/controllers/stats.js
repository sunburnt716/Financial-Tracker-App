import Transaction from "../models/transactionsModel.js";

export const getLastWeekTransactions = async (req, res) => {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const recentTransactions = await Transaction.find({
    date: { $gte: lastWeek },
  }).sort({ date: -1 });
};

export const aggregatedTransactions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date("1970-01-01");
    const end = endDate ? new Date(endDate) : new Date();

    const results = await Transaction.aggregate([
      { $match: { date: { $get: start, $lte: end } } }, //filter by date range
      {
        $group: {
          _id: null, //group everything together, or by category
          totalAmount: { $sum: "$price" }, //sum prices
          count: { $sum: 1 }, //count transactions
        },
      },
    ]);

    res.json(results[0] || { totalAmount: 0, count: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to aggregate trnasactions" });
  }
};

const stats = await Transaction.aggregate([
  { $match: { date: { $gte: start, $lte: end } } },
  {
    $facet: {
      totalStats: [{ $group: { _id: null, total: { $sum: "$price" } } }],
      weeklyStats: [
        { $group: { _id: { $week: "$date" }, total: { $sum: "$price" } } },
      ],
    },
  },
]);
console.log(weeklyTotals);
