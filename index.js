const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ✨ NOVO: Endpoint para servir a página de teste
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✨ NOVO: Endpoint para emular pagamento PIX via HTTP POST
app.post("/api/emulate-pix", (req, res) => {
  const { compra_id, valor, txid } = req.body;

  if (!compra_id) {
    return res.status(400).json({
      success: false,
      error: "compra_id é obrigatório",
    });
  }

  console.log(`💰 Emulando pagamento PIX para compra_id: ${compra_id}`);

  const notificationData = {
    compra_id: compra_id,
    status: "PAGO",
    txid: txid || `TXID_EMULADO_${Date.now()}`,
    valor: valor || 100.0,
    timestamp: new Date().toISOString(),
  };

  io.to(compra_id).emit("pixNotification", notificationData);

  console.log(
    `✅ Notificação PIX emulada enviada para a sala ${compra_id}:`,
    notificationData
  );

  res.json({
    success: true,
    message: `Pagamento PIX emulado para ${compra_id}`,
    data: notificationData,
  });
});

app.post("/api/notify-room", (req, res) => {
  const { room, event, data: notificationData } = req.body;

  if (!room) {
    return res.status(400).json({
      success: false,
      error: "room é obrigatório",
    });
  }

  if (!event) {
    return res.status(400).json({
      success: false,
      error: "event é obrigatório",
    });
  }

  console.log(`📢 API: Notificando sala ${room} com evento ${event}`);
  console.log(`   - Dados:`, notificationData);

  io.to(room).emit(event, notificationData);

  console.log(`✅ API: Notificação ${event} enviada para a sala ${room}`);

  res.json({
    success: true,
    message: `Notificação ${event} enviada para a sala ${room}`,
    data: {
      room,
      event,
      notificationData,
      timestamp: new Date().toISOString(),
    },
  });
});

io.on("connection", (socket) => {
  const sessionId = socket.handshake.query.sessionId || socket.id;
  console.log(`✅ Cliente conectado: ${socket.id} (Session ID: ${sessionId})`);

  // Cliente se junta a uma sala específica para notificações PIX
  socket.on("joinRoom", (roomName) => {
    socket.join(roomName);
    console.log(`🚪 Cliente ${socket.id} entrou na sala: ${roomName}`);

    // ✨ NOVO: Confirmar entrada na sala
    socket.emit("roomJoined", {
      roomId: roomName,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  // Evento de pagamento PIX (privado)g
  socket.on("pixPayment", (data) => {
    console.log("💰 Pagamento PIX recebido:", data);
    if (data.paymentData && data.paymentData.compra_id) {
      const paymentData = data.paymentData;
      // ✨ AJUSTADO: Garantir que sempre tenha status PAGO
      const notificationData = {
        compra_id: paymentData.compra_id,
        status: paymentData.status || "PAGO", // ← Sempre enviar status
        txid: paymentData.txid,
        valor: paymentData.valor,
        timestamp: new Date().toISOString(),
      };

      io.to(paymentData.compra_id).emit("pixNotification", notificationData);

      console.log(
        `✅ Notificação PIX enviada para a sala ${paymentData.compra_id}:`,
        notificationData
      );
    } else {
      console.warn(
        "⚠️ Evento pixPayment recebido sem compra_id. Notificação não enviada para sala específica."
      );
    }
  });

  // ✨ NOVO: Ping/Pong para manter conexão ativa
  socket.on("ping", () => {
    socket.emit("pong");
  });

  // 🔔 Listener para notificações vindas do webhook PIX
  socket.on("notifyRoom", (data) => {
    const { room, event, data: notificationData } = data;
    console.log(`📢 Recebendo solicitação para notificar sala: ${room}`);
    console.log(`   - Evento: ${event}`);
    console.log(`   - Dados:`, notificationData);

    // Emitir o evento para a sala específica
    io.to(room).emit(event, notificationData);

    console.log(`✅ Notificação ${event} enviada para a sala ${room}`);

    // Confirmar ao remetente que a notificação foi enviada
    socket.emit("notificationSent", {
      room,
      event,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor Socket.io rodando na porta ${PORT}`);
  console.log(`📡 Sistema de notificações PIX ativo`);
  console.log(`🌐 Interface web disponível em http://localhost:${PORT}`);
});
