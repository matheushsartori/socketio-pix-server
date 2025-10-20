# 📡 Servidor Socket.io - Notificações PIX em Tempo Real

Sistema de notificações em tempo real para pagamentos PIX usando Socket.io. Permite que clientes se conectem a canais exclusivos baseados no `compra_id` e recebam atualizações instantâneas sobre o status dos pagamentos.

**🌐 Servidor:** `https://alivepro.net`  
**🔒 Protocolo:** WSS (WebSocket Secure)

## 🚀 Início Rápido

### Instalação

```bash
npm install
```

### Executar o Servidor

```bash
node index.js
```

O servidor iniciará na porta `3000` (ou na porta definida pela variável de ambiente `PORT`).

## 📋 Visão Geral

O servidor funciona com um modelo simples:

1. **Cliente se conecta** ao servidor Socket.io
2. **Cliente entra em um canal** específico usando o `compra_id` como identificador da sala
3. **Servidor envia notificações** apenas para o canal específico quando o pagamento é confirmado
4. **Cliente recebe a atualização** em tempo real

## 🔌 Conexão do Cliente

### Conectar ao Servidor

```javascript
import { io } from 'socket.io-client';

const socket = io('https://alivepro.net', {
  transports: ['websocket'],
  secure: true
});

socket.on('connect', () => {
  console.log('✅ Conectado ao servidor Socket.io');
});
```

### Entrar em um Canal (Sala)

Cada compra tem um canal exclusivo identificado pelo `compra_id`:

```javascript
const compra_id = 'COMPRA_12345';

// Entrar no canal da compra
socket.emit('joinRoom', compra_id);

// Confirmação de entrada no canal
socket.on('roomJoined', (data) => {
  console.log('🚪 Entrou no canal:', data);
  // { roomId: 'COMPRA_12345', socketId: 'abc123', timestamp: '2025-10-20T...' }
});
```

### Receber Notificações de Pagamento

```javascript
socket.on('pixNotification', (data) => {
  console.log('💰 Pagamento recebido:', data);
  
  // Estrutura dos dados:
  // {
  //   compra_id: 'COMPRA_12345',
  //   status: 'PAGO',
  //   txid: 'TXID_123...',
  //   valor: 100.00,
  //   timestamp: '2025-10-20T...'
  // }
  
  if (data.status === 'PAGO') {
    // Atualizar UI, redirecionar, etc.
  }
});
```

## 🎯 Eventos Socket.io

### Eventos do Cliente → Servidor

| Evento | Parâmetros | Descrição |
|--------|-----------|-----------|
| `joinRoom` | `roomName` (string) | Entra em um canal específico para receber notificações |
| `pixPayment` | `{ paymentData }` | Envia dados de pagamento PIX (uso interno) |
| `notifyRoom` | `{ room, event, data }` | Notifica uma sala específica com dados customizados |
| `ping` | - | Mantém a conexão ativa |

### Eventos do Servidor → Cliente

| Evento | Dados | Descrição |
|--------|-------|-----------|
| `roomJoined` | `{ roomId, socketId, timestamp }` | Confirmação de entrada em uma sala |
| `pixNotification` | `{ compra_id, status, txid, valor, timestamp }` | Notificação de pagamento PIX |
| `notificationSent` | `{ room, event, timestamp }` | Confirmação de envio de notificação |
| `pong` | - | Resposta ao ping |

## 🌐 Endpoints HTTP

### POST `/api/emulate-pix`

Emula um pagamento PIX para testes.

**Request:**
```json
{
  "compra_id": "COMPRA_12345",
  "valor": 100.00,
  "txid": "TXID_OPCIONAL"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pagamento PIX emulado para COMPRA_12345",
  "data": {
    "compra_id": "COMPRA_12345",
    "status": "PAGO",
    "txid": "TXID_EMULADO_1234567890",
    "valor": 100.00,
    "timestamp": "2025-10-20T12:00:00.000Z"
  }
}
```

**Exemplo com cURL:**
```bash
curl -X POST https://alivepro.net/api/emulate-pix \
  -H "Content-Type: application/json" \
  -d '{"compra_id": "COMPRA_12345", "valor": 100.00}'
```

**Exemplo com JavaScript:**
```javascript
fetch('https://alivepro.net/api/emulate-pix', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    compra_id: 'COMPRA_12345',
    valor: 100.00
  })
});
```

### GET `/`

Serve a interface web de testes (se disponível em `public/index.html`).

## 💡 Exemplos de Uso

### Exemplo Completo - Cliente React/Next.js

```typescript
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function PagamentoPage({ compra_id }: { compra_id: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);

  useEffect(() => {
    // Conectar ao servidor
    const socketInstance = io('https://alivepro.net', {
      transports: ['websocket'],
      secure: true
    });

    socketInstance.on('connect', () => {
      console.log('✅ Conectado ao servidor');
      
      // Entrar no canal da compra
      socketInstance.emit('joinRoom', compra_id);
    });

    socketInstance.on('roomJoined', (data) => {
      console.log('🚪 Entrou no canal:', data.roomId);
    });

    // Escutar notificações de pagamento
    socketInstance.on('pixNotification', (data) => {
      console.log('💰 Pagamento recebido:', data);
      
      if (data.status === 'PAGO' && data.compra_id === compra_id) {
        setPagamentoConfirmado(true);
      }
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, [compra_id]);

  return (
    <div>
      {pagamentoConfirmado ? (
        <div>✅ Pagamento Confirmado!</div>
      ) : (
        <div>⏳ Aguardando pagamento...</div>
      )}
    </div>
  );
}
```

### Exemplo - Node.js (Webhook)

```javascript
const { io } = require('socket.io-client');

// Conectar ao servidor Socket.io
const socket = io('https://alivepro.net', {
  transports: ['websocket'],
  secure: true
});

socket.on('connect', () => {
  console.log('✅ Webhook conectado ao Socket.io');
});

// Função para notificar pagamento
function notificarPagamentoPix(compra_id, dadosPagamento) {
  socket.emit('notifyRoom', {
    room: compra_id,
    event: 'pixNotification',
    data: {
      compra_id: compra_id,
      status: 'PAGO',
      txid: dadosPagamento.txid,
      valor: dadosPagamento.valor,
      timestamp: new Date().toISOString()
    }
  });
}

// Usar no webhook
app.post('/webhook/pix', (req, res) => {
  const { compra_id, txid, valor } = req.body;
  
  notificarPagamentoPix(compra_id, { txid, valor });
  
  res.json({ success: true });
});
```

### Exemplo - Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Notificações PIX</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <div id="status">⏳ Aguardando conexão...</div>
  
  <script>
    const compra_id = 'COMPRA_12345';
    const socket = io('https://alivepro.net', {
      transports: ['websocket'],
      secure: true
    });
    
    socket.on('connect', () => {
      document.getElementById('status').textContent = '🔌 Conectado! Entrando no canal...';
      socket.emit('joinRoom', compra_id);
    });
    
    socket.on('roomJoined', (data) => {
      document.getElementById('status').textContent = `🚪 No canal: ${data.roomId}`;
    });
    
    socket.on('pixNotification', (data) => {
      if (data.status === 'PAGO') {
        document.getElementById('status').textContent = '✅ Pagamento Confirmado!';
        document.getElementById('status').style.color = 'green';
      }
    });
  </script>
</body>
</html>
```

## 🔧 Configuração

### Variáveis de Ambiente

```bash
PORT=3000  # Porta do servidor (padrão: 3000)
```

### CORS

O servidor está configurado para aceitar conexões de qualquer origem:

```javascript
cors: {
  origin: "*",
  methods: ["GET", "POST"]
}
```

Para produção, configure origens específicas:

```javascript
cors: {
  origin: "https://seusite.com",
  methods: ["GET", "POST"]
}
```

## 🧪 Testando o Sistema

### Teste 1: Conectar e Entrar em um Canal

```javascript
const socket = io('https://alivepro.net', {
  transports: ['websocket'],
  secure: true
});
socket.emit('joinRoom', 'TESTE_123');
```

### Teste 2: Emular Pagamento

```bash
curl -X POST https://alivepro.net/api/emulate-pix \
  -H "Content-Type: application/json" \
  -d '{"compra_id": "TESTE_123", "valor": 50.00}'
```

### Teste 3: Ping/Pong (Manter Conexão)

```javascript
setInterval(() => {
  socket.emit('ping');
}, 30000); // A cada 30 segundos

socket.on('pong', () => {
  console.log('🏓 Pong recebido');
});
```

## 📊 Fluxo de Comunicação

```
┌─────────────┐                 ┌─────────────┐                 ┌─────────────┐
│   Cliente   │                 │   Servidor  │                 │   Webhook   │
│  (Browser)  │                 │  Socket.io  │                 │     PIX     │
└─────────────┘                 └─────────────┘                 └─────────────┘
       │                               │                               │
       │  1. connect()                 │                               │
       ├──────────────────────────────>│                               │
       │                               │                               │
       │  2. joinRoom(compra_id)       │                               │
       ├──────────────────────────────>│                               │
       │                               │                               │
       │  3. roomJoined                │                               │
       │<──────────────────────────────┤                               │
       │                               │                               │
       │                               │  4. Pagamento confirmado      │
       │                               │<──────────────────────────────┤
       │                               │                               │
       │  5. pixNotification           │                               │
       │<──────────────────────────────┤                               │
       │  (status: PAGO)               │                               │
       │                               │                               │
```

## 🔐 Segurança

### Recomendações para Produção

1. **Configure CORS adequadamente** - Limite as origens permitidas
2. **Use HTTPS** - Sempre use conexões seguras em produção
3. **Autenticação** - Adicione autenticação nos eventos sensíveis
4. **Validação** - Valide todos os dados recebidos
5. **Rate Limiting** - Implemente limitação de taxa para prevenir abuso

### Exemplo de Autenticação

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (isValidToken(token)) {
    next();
  } else {
    next(new Error('Autenticação falhou'));
  }
});
```

## 📝 Logs

O servidor registra automaticamente:

- ✅ Conexões de clientes
- 🚪 Entrada em canais/salas
- 💰 Pagamentos recebidos
- 📢 Notificações enviadas
- ❌ Desconexões

Exemplo de saída:
```
🚀 Servidor Socket.io rodando na porta 3000
📡 Sistema de notificações PIX ativo
🌐 Interface web disponível em https://alivepro.net
✅ Cliente conectado: abc123 (Session ID: abc123)
🚪 Cliente abc123 entrou na sala: COMPRA_12345
💰 Pagamento PIX emulado para compra_id: COMPRA_12345
✅ Notificação PIX emulada enviada para a sala COMPRA_12345
```

## 🛠️ Troubleshooting

### Cliente não recebe notificações

1. Verifique se o cliente entrou na sala correta com `joinRoom`
2. Confirme que o `compra_id` é o mesmo em ambos os lados
3. Verifique os logs do servidor
4. Teste com `/api/emulate-pix` primeiro

### Conexão caindo

1. Implemente ping/pong para manter a conexão ativa
2. Configure reconnection no cliente:

```javascript
const socket = io('https://alivepro.net', {
  transports: ['websocket'],
  secure: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

### CORS errors

Configure o CORS adequadamente no servidor para sua origem específica.

## 📦 Dependências

```json
{
  "express": "^4.x",
  "socket.io": "^4.x",
  "node-fetch": "^2.x"
}
```

## 📄 Licença

Este projeto é fornecido como exemplo educacional.

## 🤝 Suporte

Para problemas ou dúvidas, verifique:
- Os logs do servidor
- A documentação do Socket.io: https://socket.io/docs/
- Os exemplos de código acima

---

**Desenvolvido com ❤️ para notificações PIX em tempo real**

