/**
 * This script updates all CodeFile documents to ensure they have a difficulty field set to 'easy' by default.
 * Run this directly in MongoDB shell or execute as a Node.js script with MongoDB connection.
 */

// For MongoDB shell
db.getCollection('codefiles').updateMany(
  { difficulty: { $exists: false } },
  { $set: { difficulty: 'easy' } }
);

// For Node.js script execution
/*
const mongoose = require('mongoose');
const config = require('../config/db');

mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB Connected');
  
  // Update all CodeFile documents without a difficulty field
  const result = await mongoose.connection.db.collection('codefiles').updateMany(
    { difficulty: { $exists: false } },
    { $set: { difficulty: 'easy' } }
  );
  
  console.log(`Updated ${result.modifiedCount} files to have 'easy' difficulty`);
  console.log(`${result.matchedCount} files matched the query`);
  
  mongoose.disconnect();
  console.log('MongoDB Disconnected');
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});
*/

// To verify the update, run this query in MongoDB shell
// db.getCollection('codefiles').countDocuments({ difficulty: { $exists: true } });
// db.getCollection('codefiles').countDocuments({ difficulty: { $exists: false } });
