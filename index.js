
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir todas as origens para testes
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Servidor Socket.io para Notificações PIX está rodando!');
});

io.on('connection', (socket) => {
  console.log('Um cliente se conectou:', socket.id);

  socket.on('pixPayment', (data) => {
    console.log('Pagamento PIX recebido:', data);
    io.emit('pixNotification', data); // Envia a notificação para todos os clientes conectados
  });

  socket.on('disconnect', () => {
    console.log('Um cliente se desconectou:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor Socket.io rodando na porta ${PORT}`);
});

