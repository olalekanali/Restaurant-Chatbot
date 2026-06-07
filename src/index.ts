import dotenv from "dotenv";
import { createApp } from "./app";
import { connectDB } from "./config/db";
import { seedMenuIfEmpty } from "./data/menu";

dotenv.config();

async function bootstrap() {
  const port = parseInt(process.env.PORT || "3000", 10);
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/naija_kitchen";

  await connectDB(mongoUri);
  await seedMenuIfEmpty();

  const app = createApp(mongoUri);
  app.listen(port, () => {
    console.log(`🍽️  Naija Kitchen chatbot running at http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
