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

app.get("/", (req, res) => {
  res.send("Servidor Socket.io para Notificações PIX e Funil de Checkout está rodando!");
});

io.on("connection", (socket) => {
  console.log("Um cliente se conectou:", socket.id);

  // Cliente se junta a uma sala específica para notificações PIX
  socket.on("joinRoom", (roomName) => {
    socket.join(roomName);
    console.log(`Cliente ${socket.id} entrou na sala: ${roomName}`);
  });

  // Cliente admin se junta à sala do funil
  socket.on("joinAdminFunnel", () => {
    socket.join('admin_funnel');
    console.log(`Admin client ${socket.id} joined admin_funnel room.`);
    emitFunnelUpdate(); // Emite o estado atual assim que um admin se conecta
  });

  // Evento de pagamento PIX (privado)
  socket.on("pixPayment", (data) => {
    console.log("Pagamento PIX recebido:", data);
    if (data.compra_id) {
      io.to(data.compra_id).emit("pixNotification", data); // Envia a notificação apenas para a sala específica
      console.log(`Notificação PIX enviada para a sala ${data.compra_id}`);
      
      // Remove do pix_pending e adiciona ao completed
      if (checkoutFunnel.step4_pix_pending.has(data.compra_id)) {
        checkoutFunnel.step4_pix_pending.delete(data.compra_id);
        checkoutFunnel.step5_completed.add(data.compra_id);
        emitFunnelUpdate();
      }

    } else {
      console.warn("Evento pixPayment recebido sem compra_id. Notificação não enviada para sala específica.");
      // Nenhuma notificação enviada se não houver compra_id para garantir canais privados.
    }
  });

  // Eventos para rastrear o funil de checkout
  socket.on('trackFunnelStep', (data) => {
    const { userId, step } = data;
    console.log(`Tracking user ${userId} at step ${step}`);

    // Lógica para mover o usuário entre as etapas do funil
    for (const s in checkoutFunnel) {
      if (s !== step) {
        checkoutFunnel[s].delete(userId);
      }
    }
    checkoutFunnel[step].add(userId);
    emitFunnelUpdate();
  });

  socket.on("disconnect", () => {
    console.log("Um cliente se desconectou:", socket.id);
    // Remover o usuário de todas as etapas do funil ao desconectar
    for (const step in checkoutFunnel) {
      checkoutFunnel[step].forEach(userId => {
        // Isso é simplificado. Em um cenário real, você precisaria de um mapeamento socket.id -> userId
        // Por enquanto, apenas remove todos os usuários associados a este socket.id se houver um mapeamento.
        // Para este exemplo, vamos assumir que userId é o socket.id para simplificar o rastreamento de desconexão.
        // Em um sistema real, o userId seria persistente.
        if (checkoutFunnel[step].has(socket.id)) {
          checkoutFunnel[step].delete(socket.id);
        }
      });
    }
    emitFunnelUpdate();
  });
});

server.listen(PORT, () => {
  console.log(`Servidor Socket.io rodando na porta ${PORT}`);
});

