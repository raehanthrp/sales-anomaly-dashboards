import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { IsolationForest } from "ml-isolation-forest";
import { SalesDataPoint } from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/predict", (req, res) => {
    const { data, threshold = 0.65 } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: "Invalid data format" });
    }

    try {
      // Prepare data for Isolation Forest
      // We'll use sales and orders as features
      const features = data.map((d: SalesDataPoint) => [d.sales, d.orders]);

      const isf = new IsolationForest({ nEstimators: 100, maxSamples: 'auto' });
      isf.train(features);
      
      const scores = isf.predict(features);

      const result = data.map((d: SalesDataPoint, i: number) => ({
        ...d,
        anomalyScore: scores[i],
        isAnomaly: scores[i] > threshold
      }));

      res.json({ data: result });
    } catch (error) {
      console.error("Prediction error:", error);
      res.status(500).json({ error: "Failed to process anomaly detection" });
    }
  });

  // Mock historical data generation
  app.get("/api/historical-data", (req, res) => {
    const data: SalesDataPoint[] = [];
    const now = new Date();
    
    for (let i = 60; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Base sales around 1000 with some noise
      let sales = 800 + Math.random() * 400;
      let orders = 40 + Math.random() * 20;

      // Inject some intentional anomalies
      if (i === 10) { // Big spike
        sales = 2500;
        orders = 120;
      }
      if (i === 45) { // Sharp drop
        sales = 200;
        orders = 5;
      }
      if (i === 25) { // Another spike
        sales = 1800;
        orders = 90;
      }

      data.push({
        date: date.toISOString().split('T')[0],
        sales: Math.round(sales),
        orders: Math.round(orders),
      });
    }
    res.json(data);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
