import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // <-- use the token the client sent

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded MUST contain { id: user._id }
    req.user = decoded.id;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid Token" });
  }
}
