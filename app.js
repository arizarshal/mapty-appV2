import express from "express";
import workoutRouter from "./routes.js";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const url = process.env.DATABASE.replace('<PASSWORD>', process.env.PASSWORD)
mongoose.connect(url, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
  // dbName: 'your_database_name' // ✅ Optional: specify db name
})
  .then(() => {
    console.log("Mongoose connected to MongoDB");
  })
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1); // Exit if DB connection fails
  });
 
// Static file
app.use(express.static(__dirname)); // Serve static files from the current directory
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the public

//  CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:500');
  res.header('Access-Control-Allow-Header', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next()
})


// Routes
app.use("/", workoutRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong");
  next();
});

// Start server
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
