import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import { Server, createServer } from "http";
import { Socket } from "socket.io";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 8000;

app.get("/", (req: Request, res: Response) => {
  const options = { root: path.join(__dirname) };
  const filepath = "/views/index.html";
  res.sendFile(filepath, options);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
