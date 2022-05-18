import { Server as httpServer } from "http";
import { Server, Socket } from "socket.io";
import moment from "moment-timezone";

enum SocketEvents {
  CONNECTION = "connection",
  DISCONNECT = "disconnect",
  JOIN = "join",
  LEAVE = "leave",
  INVITE = "invite",
  VOTE = "vote",
  VOTED = "voted",
}

export default class SocketServer {
  server: httpServer;
  io: Server;
  poll: Poll;
  users: User[];

  constructor(server: httpServer) {
    this.server = server;
    this.io = new Server(this.server);
    this.poll = new Poll(this.getRandomToken(), this.getCurrentPollName());
    this.users = [];
  }

  getUser(id: string) {
    return this.users.filter(u => u.id === id)[0];
  }

  getUserFromWallet(wallet: string) {
    return this.users.filter(u => u.wallet === wallet)[0];
  }

  getCurrentPollName() {
    return `Sondage clim de ${moment().tz("Europe/Paris").hour()}h-${moment().tz("Europe/Paris").hour() + 1}h`;
  }

  getRandomToken() {
    return Math.random()
      .toString(36)
      .substr(2, 9);
  }

  addVote(vote: Vote) {
    this.poll.votes.push(vote);
  }

  getCurrentPoll() {
    if(this.poll === undefined)
      return new Poll(this.getRandomToken(), this.getCurrentPollName());
    return this.poll;
  }

  getOption(id: number) {
    return this.poll.options.filter(o => o.id === id)[0];
  }

  handleEvents() {
    console.log("⚡️[server]: Socket server ready to handle events");
    this.io.on(SocketEvents.CONNECTION, (socket: Socket) => {
      console.log("⚡️[server]: Client connected");

      this.poll = this.getCurrentPoll();

      socket.emit(SocketEvents.INVITE, {
        poll: JSON.stringify(this.poll),
      });

      socket.on(SocketEvents.DISCONNECT, () => {
        const user = this.getUser(socket.id);
        if(user) {
          this.users = this.users.splice(this.users.indexOf(user), 1);
          socket.leave(user.poll);
          console.log(`⚡️[server]: ${user.firstname} has disconnected`);
          console.log(`⚡️[server]: ${this.users.length} user${this.users.length > 1 ? 's' : ''} left`);
        }
      });

      socket.on(SocketEvents.JOIN, (poll: string, user: User) => {
        user.id = socket.id;
        user.poll = poll;
        if(!this.users.some(u => u.wallet === user.wallet)) {
          this.users.push(user);
          socket.join(poll);
          console.log(`⚡️[server]: ${user.firstname} joined poll ${poll}`);
          console.log(`⚡️[server]: ${this.users.length} user${this.users.length > 1 ? 's' : ''} connected`);
        }
      });

      socket.on(SocketEvents.LEAVE, () => {
        const user = this.getUser(socket.id);
        if(user) {
          this.users = this.users.splice(this.users.indexOf(user), 1);
          socket.leave(user.poll);
          console.log(`⚡️[server]: ${user.firstname} has disconnected`);
          console.log(`⚡️[server]: ${this.users.length} user${this.users.length > 1 ? 's' : ''} left`);
        }
      });

      socket.on(SocketEvents.VOTE, (id: any) => {
        id = parseInt(id.toString());
        const user = this.getUser(socket.id);
        const poll = this.getCurrentPoll();
        const option = this.getOption(id);
        const vote = new Vote(poll, option, user);

        console.log(`⚡️[server]: ${user.firstname} voted ${option.value} on poll ${poll.title}`);
        this.io.to(vote.poll.id).emit(SocketEvents.VOTED, vote);
      });
    });
  }
}

export class User {
  id: string;
  firstname: string;
  lastname: string;
  wallet: string;
  poll: string;

  constructor(id: string, firstname: string, lastname: string, wallet: string) {
    this.id = id;
    this.poll = null;
    this.firstname = firstname;
    this.lastname = lastname;
    this.wallet = wallet;
  }
}

export class Option {
  id: number;
  value: string;

  constructor(id: number, value: string) {
    this.id = id;
    this.value = value;
  }
}
export class Poll {
  id: string;
  title: string;
  votes: Vote[];
  options: Option[];
  start: string;
  end: string;

  constructor(id: string, title: string,) {
    this.id = id;
    this.title = title;
    this.votes = [];
    this.options = [
      new Option(1, "17°C"),
      new Option(2, "20°C"),
      new Option(3, "24°C"),
    ];
    this.start = moment().tz("Europe/Paris").minutes(0).seconds(0).format("HH:mm:ss");
    this.end = moment().tz("Europe/Paris").minutes(0).seconds(0).add(1, 'hours').format("HH:mm:ss");
  }
}

export class Vote {
  poll: Poll;
  option: Option;
  user: User;

  constructor(poll: Poll, option: Option, user: User) {
    this.poll = poll;
    this.option = option;
    this.user = user;
  }
}
