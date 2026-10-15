// Temporary read-back: confirms the most recent analysis is actually in MongoDB.
import { MongoClient } from "mongodb";
import "./src/config.js";

const uri = `mongodb+srv://${encodeURIComponent(process.env.MONGO_DB_USERNAME)}:${encodeURIComponent(process.env.MONGO_DB_PASSWORD)}@cluster0.av8tx7a.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri);

await client.connect();
const collection = client.db(process.env.MONGODB_DATABASE || "resume_analyzer").collection("analyses");
const total = await collection.countDocuments();
const latest = await collection.find({}, { sort: { createdAt: -1 }, limit: 1 }).toArray();

console.log("documents in analyses:", total);
if (latest[0]) {
  const { _id, fileName, score, matchedCount, totalKeywords, createdAt } = latest[0];
  console.log("latest:", JSON.stringify({ id: String(_id), fileName, score, matchedCount, totalKeywords, createdAt }));
  console.log("has resumeText:", typeof latest[0].resumeText === "string" && latest[0].resumeText.length > 0);
  console.log("has jobDescription:", typeof latest[0].jobDescription === "string" && latest[0].jobDescription.length > 0);
}

await client.close();
