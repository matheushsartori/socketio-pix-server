
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir todas as origens para testes
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Servidor Socket.io para Notificações PIX está rodando!");
});

io.on("connection", (socket) => {
  console.log("Um cliente se conectou:", socket.id);

  socket.on("joinRoom", (roomName) => {
    socket.join(roomName);
    console.log(`Cliente ${socket.id} entrou na sala: ${roomName}`);
  });

  socket.on("pixPayment", (data) => {
    console.log("Pagamento PIX recebido:", data);
    if (data.compra_id) {
      io.to(data.compra_id).emit("pixNotification", data); // Envia a notificação apenas para a sala específica
      console.log(`Notificação PIX enviada para a sala ${data.compra_id}`);
    } else {
      console.warn("Evento pixPayment recebido sem compra_id. Notificação não enviada para sala específica.");
      // Nenhuma notificação enviada se não houver compra_id para garantir canais privados.
    }
  });

  socket.on("disconnect", () => {
    console.log("Um cliente se desconectou:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor Socket.io rodando na porta ${PORT}`);
});

