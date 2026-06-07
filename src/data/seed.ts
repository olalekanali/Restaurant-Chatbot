import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { MenuItem } from "../models/MenuItem";
import { MENU } from "./menu";

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/naija_kitchen";
  await connectDB(uri);
  await MenuItem.deleteMany({});
  await MenuItem.insertMany(MENU);
  console.log(`🌱 Re-seeded ${MENU.length} menu items`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
