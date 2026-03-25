const mongoose = require("mongoose");

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI)
      .then((conn) => {
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((err) => {
        connectionPromise = null;
        console.error(`MongoDB connection error: ${err.message}`);
        throw err;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;
