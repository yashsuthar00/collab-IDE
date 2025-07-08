// MongoDB query to update existing files with a default 'easy' difficulty level

// Run this query in your MongoDB shell or MongoDB Compass:

db.getCollection('codefiles').updateMany(
  { difficulty: { $exists: false } },
  { $set: { difficulty: 'easy' } }
);

// This query will:
// 1. Find all documents in the 'codefiles' collection that don't have a 'difficulty' field
// 2. Set the 'difficulty' field to 'easy' for all matching documents

// You can verify the update with:
db.getCollection('codefiles').find({ difficulty: 'easy' }).count();

// To get the distribution of files by difficulty:
db.getCollection('codefiles').aggregate([
  { $group: { _id: "$difficulty", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]);
