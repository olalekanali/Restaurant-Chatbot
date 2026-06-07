import path from "path";
import express, { Application } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";

import indexRoutes from "./routes/index";
import chatRoutes from "./routes/chatRoutes";
import paymentRoutes from "./routes/paymentRoutes";

export function createApp(mongoUri: string): Application {
  const app = express();

  // Views
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  // Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static assets
  app.use(express.static(path.join(__dirname, "..", "public")));

  // Device-based session, persisted in MongoDB via a signed cookie.
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev_secret_change_me",
      resave: false,
      saveUninitialized: true,
      store: MongoStore.create({ mongoUrl: mongoUri, collectionName: "sessions" }),
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        sameSite: "lax",
      },
    })
  );

  // Routes
  app.use("/", indexRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/payment", paymentRoutes);

  return app;
}
