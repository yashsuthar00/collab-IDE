/**
 * Migration script for updating CodeFile documents to use 'programmingLanguage' instead of 'language'
 * Run with: node migrateLanguageField.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collab-ide';

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected for migration'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define a simple schema for the migration that has both fields
const CodeFileSchema = new mongoose.Schema({
  name: String,
  code: String,
  language: String,
  programmingLanguage: String,
  owner: mongoose.Schema.Types.ObjectId,
  directory: mongoose.Schema.Types.ObjectId,
  isPublic: Boolean,
  lastModified: Date,
  createdAt: Date
}, { timestamps: true });

const CodeFile = mongoose.model('CodeFile', CodeFileSchema);

async function migrateLanguageField() {
  try {
    console.log('Starting migration of language field to programmingLanguage field...');
    
    // Find all documents that have 'language' but not 'programmingLanguage'
    const files = await CodeFile.find({
      language: { $exists: true },
      programmingLanguage: { $exists: false }
    });
    
    console.log(`Found ${files.length} documents to migrate`);
    
    let updated = 0;
    
    // Process files in batches to avoid memory issues
    for (const file of files) {
      // Update the document
      await CodeFile.updateOne(
        { _id: file._id },
        { 
          $set: { programmingLanguage: file.language },
        }
      );
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`Migrated ${updated} documents so far...`);
      }
    }
    
    console.log(`Migration complete! Updated ${updated} documents.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}

migrateLanguageField();
