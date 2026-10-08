import { MongoClient } from "mongodb";
import "./config.js";

const DATABASE_NAME = process.env.MONGODB_DATABASE || "resume_analyzer";
const COLLECTION_NAME = "analyses";

let client;
let connectionPromise;

export class ResumeDatabaseError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function getMongoUri() {
  const username =
    process.env.MONGODB_USERNAME || process.env.MONGO_DB_USERNAME;
  const password =
    process.env.MONGODB_PASSWORD || process.env.MONGO_DB_PASSWORD;

  if (!username || !password) {
    throw new ResumeDatabaseError(
      "MONGODB_NOT_CONFIGURED",
      "Resume storage is not configured. Set MONGODB_USERNAME and MONGODB_PASSWORD on the server.",
    );
  }

  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@cluster0.av8tx7a.mongodb.net/?appName=Cluster0`;
}

async function getCollection(uri) {
  if (!client) client = new MongoClient(uri);
  if (!connectionPromise) {
    connectionPromise = client.connect().catch(async (error) => {
      connectionPromise = undefined;
      const failedClient = client;
      client = undefined;
      try {
        await failedClient.close();
      } catch (closeError) {
        console.error(
          "MongoDB client cleanup failed:",
          closeError?.name || "UnknownError",
        );
      }
      throw error;
    });
  }

  await connectionPromise;
  return client.db(DATABASE_NAME).collection(COLLECTION_NAME);
}

export async function saveResumeAnalysis({
  fileName,
  resumeText,
  jobDescription,
  analysis,
}) {
  const uri = getMongoUri();

  try {
    await (await getCollection(uri)).insertOne({
      fileName,
      resumeText,
      jobDescription,
      ...analysis,
      createdAt: new Date(),
    });
  } catch (error) {
    if (error instanceof ResumeDatabaseError) throw error;

    console.error(
      "MongoDB could not save the resume analysis:",
      error?.name || "UnknownError",
    );
    throw new ResumeDatabaseError(
      "MONGODB_SAVE_FAILED",
      "The analysis could not be saved to the database. Please try again later.",
    );
  }
}
