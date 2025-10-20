const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir todas as origens para testes
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Estrutura para armazenar o estado do funil de checkout
const checkoutFunnel = {
  'step1_cart': new Set(),
  'step2_shipping': new Set(),
  'step3_payment': new Set(),
  'step4_pix_pending': new Set(),
  'step5_completed': new Set()
};

// Função para emitir o estado atual do funil para os clientes admin
function emitFunnelUpdate() {
  const funnelData = {};
  for (const step in checkoutFunnel) {
    funnelData[step] = checkoutFunnel[step].size;
  }
  io.to('admin_funnel').emit('funnelUpdate', funnelData);
  console.log('Funnel update emitted to admin_funnel:', funnelData);
}

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
      error: "compra_id é obrigatório" 
    });
  }

  console.log(`💰 Emulando pagamento PIX para compra_id: ${compra_id}`);

  const notificationData = {
    compra_id: compra_id,
    status: 'PAGO',
    txid: txid || `TXID_EMULADO_${Date.now()}`,
    valor: valor || 100.00,
    timestamp: new Date().toISOString()
  };

  // Emitir notificação para a sala específica da compra
  io.to(compra_id).emit("pixNotification", notificationData);
  console.log(`✅ Notificação PIX emulada enviada para a sala ${compra_id}:`, notificationData);

  // Atualizar o funil de checkout
  if (checkoutFunnel.step4_pix_pending.has(compra_id)) {
    checkoutFunnel.step4_pix_pending.delete(compra_id);
    checkoutFunnel.step5_completed.add(compra_id);
    emitFunnelUpdate();
  }

  res.json({ 
    success: true, 
    message: `Pagamento PIX emulado para ${compra_id}`,
    data: notificationData
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
    socket.emit('roomJoined', { 
      roomId: roomName,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Cliente admin se junta à sala do funil
  socket.on("joinAdminFunnel", () => {
    socket.join('admin_funnel');
    console.log(`Admin client ${socket.id} joined admin_funnel room.`);
    emitFunnelUpdate(); // Emite o estado atual assim que um admin se conecta
  });

  // Evento de pagamento PIX (privado)
  socket.on("pixPayment", (data) => {
    console.log("💰 Pagamento PIX recebido:", data);
    if (data.compra_id) {
      // ✨ AJUSTADO: Garantir que sempre tenha status PAGO
      const notificationData = {
        compra_id: data.compra_id,
        status: data.status || 'PAGO', // ← Sempre enviar status
        txid: data.txid,
        valor: data.valor,
        timestamp: new Date().toISOString()
      };
      
      io.to(data.compra_id).emit("pixNotification", notificationData);
      console.log(`✅ Notificação PIX enviada para a sala ${data.compra_id}:`, notificationData);
      
      // Remove do pix_pending e adiciona ao completed
      if (checkoutFunnel.step4_pix_pending.has(data.compra_id)) {
        checkoutFunnel.step4_pix_pending.delete(data.compra_id);
        checkoutFunnel.step5_completed.add(data.compra_id);
        emitFunnelUpdate();
      }

    } else {
      console.warn("⚠️ Evento pixPayment recebido sem compra_id. Notificação não enviada para sala específica.");
    }
  });

  // Eventos para rastrear o funil de checkout
  socket.on('trackFunnelStep', (data) => {
    const { userId, step, pedidoId } = data;
    console.log(`📊 Tracking user ${userId} at step ${step}`);

    // Lógica para mover o usuário entre as etapas do funil
    for (const s in checkoutFunnel) {
      if (s !== step) {
        checkoutFunnel[s].delete(userId);
      }
    }
    checkoutFunnel[step].add(userId);
    emitFunnelUpdate();
  });

  // ✨ NOVO: Ping/Pong para manter conexão ativa
  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
    // Remover o usuário de todas as etapas do funil ao desconectar
    for (const step in checkoutFunnel) {
      if (checkoutFunnel[step].has(sessionId)) {
        checkoutFunnel[step].delete(sessionId);
      }
    }
    emitFunnelUpdate();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor Socket.io rodando na porta ${PORT}`);
  console.log(`📡 Sistema de notificações PIX ativo`);
  console.log(`🌐 Interface web disponível em http://localhost:${PORT}`);
});

