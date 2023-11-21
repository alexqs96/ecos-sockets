import "dotenv/config";
import express from "express";
import http from "http";
import morgan from "morgan";
import cors from "cors";
import { Server } from "socket.io";
import User from "./models/User.js";
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

app.use(cors());
app.use(morgan("dev"));
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Ecos Server",
  });
});

const io = new Server(server, {
  maxHttpBufferSize: 1e8,
  cors: {
    origin: [process.env.CLIENT_URL, "*"],
    optionsSuccessStatus: 200,
    methods: ["GET"],
  },
});

io.on("connection", (socket) => {
  console.log("client N°: " + socket.id);

  socket.on("connectToChat", async (username) => {
    try {
      await User.findOneAndUpdate({ username }, { socketId: socket.id });
    } catch (error) {
      console.error("Error al conectarte al server:", error.message);
    }
  });

  socket.on("disconnect", async () => {
    console.log("Usuario desconectado:", socket.id);
    await User.findOneAndUpdate({ socketId: socket.id }, { socketId: null });
  });

  socket.on("sendMessage", async (username) => {
    try {
      const recipient = await User.findOne({
        username
      }).select('socketId');

      if (recipient) {
        io.to(recipient.socketId).emit("newMessage", true);
      } else {
        socket.emit("userNotFound", false);
      }
    } catch (error) {
      console.error("Error al enviar mensaje a usuario:", error.message);
    }
  });
});

server.listen(port, () => {
  console.log(`Servidor corriendo http://localhost:${port}`);
});
