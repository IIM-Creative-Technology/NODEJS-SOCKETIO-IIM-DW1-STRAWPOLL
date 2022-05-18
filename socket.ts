import { Server as httpServer } from "http";
import { Server, Socket } from "socket.io";

enum SocketEvents {
  CONNECTION = "connection",
  DISCONNECT = "disconnect",
  VOTE = "vote",
}

export default class SocketServer {
  server: httpServer;
  io: Server;

  constructor(server: httpServer) {
    this.server = server;
    this.io = new Server(this.server);
  }

  handleEvents() {
    console.log("⚡️[server]: Socket server ready to handle events");
    this.io.on(SocketEvents.CONNECTION, (socket: Socket) => {
      console.log("Client connected");

      socket.on(SocketEvents.DISCONNECT, () => {
        console.log("Client disconnected");
      });

      socket.on(SocketEvents.VOTE, (data: Vote) => {
        console.log(`Client voted: ${data}`);
      });
    });
  }
}

export class User {
  firstname: string;
  lastname: string;
  wallet: string;

  constructor(firstname: string, lastname: string, wallet: string) {
    this.firstname = firstname;
    this.lastname = lastname;
    this.wallet = wallet;
  }

  getFullName(): string {
    return `${this.firstname} ${this.lastname}`;
  }

  getWallet(): string {
    return this.wallet;
  }
}

export class Vote {
  vote: string;
  user: User;

  constructor(vote: string, user: User) {
    this.vote = vote;
    this.user = user;
  }

  getVote(): string {
    return this.vote;
  }

  getUser(): User {
    return this.user;
  }
}
