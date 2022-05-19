import { Server as httpServer } from "http"
import { Server, Socket } from "socket.io"
import moment from "moment-timezone"
import axios from "axios"

enum SocketEvents {
  CONNECTION = "connection",
  DISCONNECT = "disconnect",
  JOIN = "join",
  JOINRESPONSE = "joinResponse",
  LEAVE = "leave",
  INVITE = "invite",
  VOTE = "vote",
  VOTED = "voted",
}

export default class SocketServer {
  server: httpServer
  io: Server
  poll: Poll
  users: User[]

  constructor(server: httpServer) {
    this.server = server
    this.io = new Server(this.server)
    this.poll = new Poll(this.getRandomToken(), this.getCurrentPollName())
    this.users = []
  }

  getUser(id: string) {
    return this.users.filter((u) => u.id === id)[0]
  }

  getUserFromWallet(wallet: string) {
    return this.users.filter((u) => u.wallet === wallet)[0]
  }

  getCurrentPollName() {
    return `Sondage clim de ${moment().tz("Europe/Paris").hour()}h-${moment().tz("Europe/Paris").hour() + 1}h`
  }

  getRandomToken() {
    return Math.random().toString(36).substr(2, 9)
  }

  addVote(vote: Vote, heddibuAmount: number) {
    if (this.poll.votes.some((v) => v.user.wallet == vote.user.wallet)) {
      console.log(`⚡️[server]: ${vote.user.firstname} has already voted`)
      return
    }
    this.poll.votes.push(vote)
    this.poll.options[this.poll.options.findIndex((o) => o.id === vote.option.id)].voteCount += heddibuAmount

    console.log(`⚡️[server]: ${vote.user.firstname} voted ${vote.option.value} on poll ${this.poll.title}`)
  }

  getCurrentPoll() {
    if (this.poll === undefined) return new Poll(this.getRandomToken(), this.getCurrentPollName())
    return this.poll
  }

  getOption(id: number) {
    return this.poll.options.filter((o) => o.id === id)[0]
  }

  async getHeddibu() {
    const response = await axios({
      url: `https://api.devnet.solana.com`,
      method: "post",
      headers: { "Content-Type": "application/json" },
      data: [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            "CBerpHYykgTgM17GCjA5CbQY6wL7eiu884ToRJhj53VF",
            {
              mint: "4YgT6u6dCmdwYhvWK5bUCvU57uFJjxjLpffE9UVy48xK",
            },
            {
              encoding: "jsonParsed",
            },
          ],
        },
      ],
    })
    return response.data[0].result.value[0].account.data.parsed.info.tokenAmount.uiAmountString
  }

  handleEvents() {
    console.log("⚡️[server]: Socket server ready to handle events")
    this.io.on(SocketEvents.CONNECTION, (socket: Socket) => {
      console.log("⚡️[server]: Client connected")

      this.poll = this.getCurrentPoll()

      socket.emit(SocketEvents.INVITE, {
        poll: this.poll,
      })

      socket.on(SocketEvents.DISCONNECT, () => {
        const user = this.getUser(socket.id)
        if (user) {
          this.users.splice(this.users.indexOf(user), 1)
          socket.leave(user.poll)
          console.log(`⚡️[server]: ${user.firstname} has disconnected`)
          console.log(`⚡️[server]: ${this.users.length} user${this.users.length > 1 ? "s" : ""} left`)
        }
      })

      socket.on(SocketEvents.JOIN, async (user: User) => {
        user.id = socket.id
        if (!this.users.some((u) => u.wallet === user.wallet)) {
          this.users.push(user)
          socket.join(user.poll)
          console.log(`⚡️[server]: ${user.firstname} joined poll ${user.poll}`)
          console.log(`⚡️[server]: ${this.users.length} user${this.users.length > 1 ? "s" : ""} connected`)
          const heddibuAmount = await this.getHeddibu()
          socket.emit(SocketEvents.JOINRESPONSE, { user: user, balance: heddibuAmount })
        }
      })

      socket.on(SocketEvents.LEAVE, () => {
        const user = this.getUser(socket.id)
        if (user) {
          this.users = this.users.splice(this.users.indexOf(user), 1)
          socket.leave(user.poll)
          console.log(`⚡️[server]: ${user.firstname} has disconnected`)
          console.log(`⚡️[server]: ${this.users.length} user${this.users.length > 1 ? "s" : ""} left`)
        }
      })

      socket.on(SocketEvents.VOTE, (optionId: any, heddibuAmount: number) => {
        optionId = parseInt(optionId.toString())
        const user = this.getUser(socket.id)
        const poll = this.getCurrentPoll()
        const option = this.getOption(optionId)
        const vote = new Vote(option, user)

        this.addVote(vote, heddibuAmount)
        this.io.to(poll.id).emit(SocketEvents.VOTED, poll.votes)
      })
    })
  }
}

export class User {
  id: string
  firstname: string
  lastname: string
  wallet: string
  poll: string

  constructor(id: string, firstname: string, lastname: string, wallet: string) {
    this.id = id
    this.poll = null
    this.firstname = firstname
    this.lastname = lastname
    this.wallet = wallet
  }
}

export class Option {
  id: number
  value: number
  voteCount: number

  constructor(id: number, value: number) {
    this.id = id
    this.value = value
    this.voteCount = 0
  }
}
export class Poll {
  id: string
  title: string
  votes: Vote[]
  options: Option[]
  start: string
  end: string

  constructor(id: string, title: string) {
    this.id = id
    this.title = title
    this.votes = []
    this.options = [new Option(0, 16), new Option(1, 18), new Option(2, 20), new Option(3, 22), new Option(4, 24)]
    this.start = moment().tz("Europe/Paris").minutes(0).seconds(0).format("HH:mm:ss")
    this.end = moment().tz("Europe/Paris").minutes(0).seconds(0).add(1, "hours").format("HH:mm:ss")
  }
}

export class Vote {
  option: Option
  user: User

  constructor(option: Option, user: User) {
    this.option = option
    this.user = user
  }
}
