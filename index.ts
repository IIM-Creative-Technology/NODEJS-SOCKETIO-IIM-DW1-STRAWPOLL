import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import { Server, createServer } from "http";
import SocketServer from "./socket"

dotenv.config();

const app: Express = express();
const httpServer: Server = createServer(app);
const port = process.env.PORT || 8000;

const socketServer = new SocketServer(httpServer)
socketServer.handleEvents();

app.get("/", (req: Request, res: Response) => {
  const options = { root: path.join(__dirname) };
  const filepath = "/views/index.html";
  res.sendFile(filepath, options);
});

httpServer.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
