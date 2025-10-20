# 📡 Documentação de Integração - Notificações PIX via Socket.IO

## 🎯 Visão Geral

Este documento descreve como o **frontend** deve se integrar com o servidor Socket.IO para receber notificações de pagamento PIX em tempo real.

### 🔐 Protocolo de Comunicação

O servidor utiliza **WebSocket Secure (WSS)** para comunicação em tempo real:

- **URL de conexão:** `wss://alivepro.net`
- **Protocolo:** WebSocket Secure (WSS) - criptografado via TLS/SSL
- **Porta:** 443 (padrão HTTPS)
- **Fallback:** Polling HTTP (caso WebSocket não esteja disponível)

---

## 🔌 Conexão com o Servidor

### 1. Incluir a biblioteca Socket.IO no frontend

```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
```

### 2. Conectar ao servidor

```javascript
// Conexão WebSocket Segura (WSS)
const socket = io('wss://alivepro.net', {
    transports: ['websocket'],  // Força uso de WebSocket
    secure: true                // Conexão segura (WSS)
});
```

**Ou de forma mais completa:**

```javascript
const socket = io('wss://alivepro.net', {
    transports: ['websocket'],
    secure: true,
    reconnection: true,          // Reconectar automaticamente
    reconnectionDelay: 1000,     // Esperar 1s antes de reconectar
    reconnectionAttempts: 5      // Tentar reconectar 5 vezes
});
```

---

## 📥 Recebendo Notificações PIX

### Passo 1: Entrar na Sala da Compra

Quando o usuário chegar na página de checkout/pagamento, o frontend deve entrar na sala específica do `compra_id`:

```javascript
const compraId = "cmgzclic20005cc7esilok0ok"; // ID da compra atual

// Entrar na sala para receber notificações
socket.emit('joinRoom', compraId);

// Confirmar que entrou na sala (opcional)
socket.on('roomJoined', (data) => {
    console.log('✅ Entrou na sala:', data);
    // data = {
    //   roomId: "cmgzclic20005cc7esilok0ok",
    //   socketId: "abc123xyz",
    //   timestamp: "2025-10-20T16:29:35.657Z"
    // }
});
```

### Passo 2: Escutar o Evento de Pagamento

```javascript
socket.on('pixNotification', (data) => {
    console.log('💰 Pagamento PIX recebido!', data);
    
    // Processar o pagamento
    if (data.status === 'PAGO') {
        // Atualizar a UI
        // Redirecionar para página de sucesso
        // Disparar conversão no Google Analytics
        // etc.
    }
});
```

---

## 📋 Estrutura dos Dados Recebidos

### Formato do Evento `pixNotification`

```json
{
  "compra_id": "cmgzclic20005cc7esilok0ok",
  "status": "PAGO",
  "txid": "TXID_REAL_123456789",
  "valor": 100.00,
  "timestamp": "2025-10-20T16:29:35.657Z"
}
```

### Descrição dos Campos

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `compra_id` | String | ✅ Sim | ID único da compra | `"cmgzclic20005cc7esilok0ok"` |
| `status` | String | ✅ Sim | Status do pagamento | `"PAGO"` |
| `txid` | String | ✅ Sim | ID da transação PIX | `"TXID_REAL_123456789"` |
| `valor` | Number | ✅ Sim | Valor pago em reais | `100.00` |
| `timestamp` | String | ✅ Sim | Data/hora no formato ISO 8601 | `"2025-10-20T16:29:35.657Z"` |

---

## 💻 Exemplo Completo de Implementação

### HTML + JavaScript

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Checkout - Aguardando Pagamento PIX</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
    <div id="status">Aguardando pagamento...</div>
    <div id="qrcode">
        <!-- QR Code do PIX aqui -->
    </div>

    <script>
        // ===================================
        // CONFIGURAÇÃO DO SOCKET.IO (WSS)
        // ===================================
        
        const socket = io('wss://alivepro.net', {
            transports: ['websocket'],
            secure: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });
        
        // Pegar o compraId da URL ou de onde estiver armazenado
        const urlParams = new URLSearchParams(window.location.search);
        const compraId = urlParams.get('compraId') || 'SEU_COMPRA_ID_AQUI';
        
        // ===================================
        // EVENTOS DE CONEXÃO
        // ===================================
        
        socket.on('connect', () => {
            console.log('✅ Conectado ao servidor Socket.IO');
            
            // Entrar na sala da compra
            socket.emit('joinRoom', compraId);
            console.log(`🚪 Entrando na sala: ${compraId}`);
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Desconectado do servidor');
        });
        
        socket.on('connect_error', (error) => {
            console.error('⚠️ Erro de conexão:', error);
        });
        
        // ===================================
        // CONFIRMAÇÃO DE ENTRADA NA SALA
        // ===================================
        
        socket.on('roomJoined', (data) => {
            console.log('✅ Confirmação de entrada na sala:', data);
        });
        
        // ===================================
        // RECEBER NOTIFICAÇÃO DE PAGAMENTO
        // ===================================
        
        socket.on('pixNotification', (data) => {
            console.log('💰 Notificação PIX recebida:', data);
            
            // Validar se é a compra correta
            if (data.compra_id !== compraId) {
                console.warn('⚠️ Notificação recebida para outro compra_id');
                return;
            }
            
            // Verificar se o pagamento foi aprovado
            if (data.status === 'PAGO') {
                handlePaymentApproved(data);
            }
        });
        
        // ===================================
        // PROCESSAR PAGAMENTO APROVADO
        // ===================================
        
        function handlePaymentApproved(paymentData) {
            console.log('✅ Pagamento aprovado!', paymentData);
            
            // 1. Atualizar a interface
            document.getElementById('status').innerHTML = `
                <h2 style="color: green;">✅ Pagamento Confirmado!</h2>
                <p>Valor: R$ ${paymentData.valor.toFixed(2)}</p>
                <p>TXID: ${paymentData.txid}</p>
                <p>Processado em: ${new Date(paymentData.timestamp).toLocaleString()}</p>
            `;
            
            // 2. Esconder QR Code
            document.getElementById('qrcode').style.display = 'none';
            
            // 3. Disparar evento de conversão (Google Analytics, Facebook Pixel, etc.)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'purchase', {
                    transaction_id: paymentData.compra_id,
                    value: paymentData.valor,
                    currency: 'BRL'
                });
            }
            
            // 4. Redirecionar após 3 segundos
            setTimeout(() => {
                window.location.href = `/sucesso?compraId=${paymentData.compra_id}`;
            }, 3000);
        }
        
        // ===================================
        // MANTER CONEXÃO ATIVA (OPCIONAL)
        // ===================================
        
        // Enviar ping a cada 30 segundos para manter conexão ativa
        setInterval(() => {
            if (socket.connected) {
                socket.emit('ping');
            }
        }, 30000);
        
        socket.on('pong', () => {
            console.log('🏓 Pong recebido - conexão ativa');
        });
    </script>
</body>
</html>
```

---

## 🔄 Fluxo Completo

```
1. 👤 Usuário entra na página de checkout
   └─> Frontend conecta ao Socket.IO

2. 🚪 Frontend entra na sala do compra_id
   └─> socket.emit('joinRoom', 'cmgzclic20005cc7esilok0ok')

3. ⏳ Usuário paga o PIX pelo app do banco
   └─> Sistema bancário notifica o servidor

4. 📡 Servidor emite notificação para a sala
   └─> io.to('compra_id').emit('pixNotification', dados)

5. ✅ Frontend recebe e processa
   └─> socket.on('pixNotification', (dados) => { ... })

6. 🎉 Redireciona para página de sucesso
```

---

## 🧪 Testando a Integração

### 1. Verificar Conexão WSS

Abra o Console do Navegador (F12) e execute:

```javascript
const socket = io('wss://alivepro.net', {
    transports: ['websocket'],
    secure: true
});

socket.on('connect', () => {
    console.log('✅ WSS conectado com sucesso!');
    console.log('Socket ID:', socket.id);
    console.log('Transport:', socket.io.engine.transport.name); // Deve mostrar "websocket"
});

socket.on('connect_error', (error) => {
    console.error('❌ Erro de conexão WSS:', error.message);
});
```

### 2. Usando o Emulador Web

1. Acesse: `https://alivepro.net/` (página do emulador)
2. Insira o `compra_id` que está testando no checkout
3. Clique em "Emular Pagamento PIX"
4. O checkout deve receber a notificação e atualizar automaticamente

### 3. Via API REST (para testes automatizados)

```bash
curl -X POST https://alivepro.net/api/emulate-pix \
  -H "Content-Type: application/json" \
  -d '{
    "compra_id": "cmgzclic20005cc7esilok0ok",
    "valor": 100.00,
    "txid": "TXID_TESTE_123"
  }'
```

### 4. Verificar no DevTools

No **Chrome DevTools** (F12):
1. Vá na aba **Network**
2. Filtre por **WS** (WebSocket)
3. Procure por conexão para `alivepro.net`
4. Você deve ver:
   - Status: `101 Switching Protocols`
   - Protocol: `websocket`
   - Mensagens sendo trocadas

---

## ⚠️ Pontos Importantes

### ✅ FAZER

1. **Sempre entrar na sala** antes de aguardar pagamento
2. **Validar o compra_id** ao receber notificação
3. **Verificar status === 'PAGO'** antes de processar
4. **Manter conexão ativa** (usar ping/pong se necessário)
5. **Tratar desconexões** e reconectar automaticamente
6. **Registrar logs** para debug

### ❌ NÃO FAZER

1. **Confiar apenas no Socket.IO** - sempre validar no backend também
2. **Processar pagamento sem validar** o compra_id
3. **Ignorar reconexões** - Socket.IO pode desconectar
4. **Bloquear a thread** durante processamento
5. **Usar HTTP em site com WSS** - navegadores bloqueiam mixed content

### ⚠️ Atenção: Mixed Content

Se seu site roda em **HTTPS**, você **DEVE** usar **WSS**. Navegadores modernos bloqueiam conexões inseguras (WS) em páginas seguras (HTTPS).

```javascript
// ✅ CORRETO - Site HTTPS com WSS
const socket = io('wss://alivepro.net', { secure: true });

// ❌ ERRADO - Site HTTPS com WS (será bloqueado)
const socket = io('ws://alivepro.net');
```

---

## 🐛 Troubleshooting

### Problema: Notificação não chega

**Possíveis causas:**
- Frontend não entrou na sala (`joinRoom` não foi chamado)
- compra_id diferente entre checkout e pagamento
- Conexão Socket.IO não estabelecida
- CORS bloqueando conexão
- Firewall bloqueando WebSocket (porta 443)
- Certificado SSL inválido

**Solução:**
```javascript
// Verificar no console do navegador:
console.log('Socket conectado?', socket.connected);
console.log('Entrou na sala?', compraId);
console.log('Transport usado:', socket.io.engine.transport.name);

// Testar manualmente
socket.emit('joinRoom', 'seu_compra_id_aqui');
```

### Problema: Erro "WebSocket connection failed"

**Causa:** Servidor não está aceitando conexões WSS ou certificado SSL inválido

**Solução:**
```javascript
// Tentar com fallback para polling
const socket = io('wss://alivepro.net', {
    transports: ['websocket', 'polling'], // Tenta WebSocket, senão usa polling
    secure: true
});

// Verificar eventos de erro
socket.on('connect_error', (error) => {
    console.error('Erro de conexão:', error.message);
    console.log('Tentando reconectar...');
});
```

### Problema: Múltiplas notificações

**Causa:** Usuário abriu várias abas ou reconectou várias vezes

**Solução:**
```javascript
let paymentProcessed = false;

socket.on('pixNotification', (data) => {
    if (paymentProcessed) {
        console.log('Pagamento já processado, ignorando...');
        return;
    }
    
    paymentProcessed = true;
    handlePaymentApproved(data);
});
```

---

## 📞 Suporte

Em caso de dúvidas ou problemas na integração:

- **Servidor Socket.IO (WSS):** `wss://alivepro.net`
- **Servidor HTTP/HTTPS:** `https://alivepro.net`
- **Emulador PIX:** `https://alivepro.net/`
- **API de Teste:** `POST https://alivepro.net/api/emulate-pix`

### 🔐 Sobre WSS (WebSocket Secure)

A conexão usa **WSS (WebSocket Secure)** que é a versão criptografada do WebSocket, similar ao HTTPS para HTTP. Isso garante:

- ✅ Comunicação criptografada
- ✅ Maior segurança dos dados
- ✅ Compatibilidade com HTTPS
- ✅ Sem bloqueios de navegadores modernos

---

## 📝 Exemplo de Dados Reais vs Emulados

### Pagamento Real
```json
{
  "compra_id": "cmgzclic20005cc7esilok0ok",
  "status": "PAGO",
  "txid": "E12345678202410201629123456",
  "valor": 199.90,
  "timestamp": "2025-10-20T16:29:35.657Z"
}
```

### Pagamento Emulado (teste)
```json
{
  "compra_id": "cmgzclic20005cc7esilok0ok",
  "status": "PAGO",
  "txid": "TXID_EMULADO_1760977775657",
  "valor": 100,
  "timestamp": "2025-10-20T16:29:35.657Z"
}
```

**A estrutura é idêntica** - a única diferença é o formato do `txid`.

---

## ✅ Checklist de Integração

### Setup Inicial
- [ ] Biblioteca Socket.IO incluída no projeto
- [ ] Conexão WSS configurada (`wss://alivepro.net`)
- [ ] Opção `transports: ['websocket']` configurada
- [ ] Opção `secure: true` configurada
- [ ] Reconexão automática habilitada

### Funcionalidades
- [ ] Evento `joinRoom` disparado ao carregar checkout
- [ ] Listener `pixNotification` configurado
- [ ] Validação de `compra_id` implementada
- [ ] Interface atualizada ao receber pagamento
- [ ] Redirecionamento após confirmação
- [ ] Eventos de analytics disparados

### Tratamento de Erros
- [ ] Tratamento de erro de conexão (`connect_error`)
- [ ] Tratamento de desconexão (`disconnect`)
- [ ] Prevenção de múltiplas notificações
- [ ] Logs de debug implementados

### Testes
- [ ] Conexão WSS verificada no DevTools
- [ ] Transport confirmado como `websocket`
- [ ] Testado com emulador web
- [ ] Testado com API REST
- [ ] Testado em HTTPS (produção)
- [ ] Testado reconexão após perda de rede

---

## 📌 Referência Rápida

### Conexão Mínima Necessária

```javascript
// 1. Conectar via WSS
const socket = io('wss://alivepro.net', {
    transports: ['websocket'],
    secure: true
});

// 2. Entrar na sala
socket.emit('joinRoom', 'SEU_COMPRA_ID');

// 3. Receber notificação
socket.on('pixNotification', (data) => {
    if (data.status === 'PAGO') {
        // Processar pagamento
    }
});
```

### Estrutura de Dados

```javascript
{
    compra_id: "cmgzclic20005cc7esilok0ok",  // String
    status: "PAGO",                           // String
    txid: "TXID_123456",                      // String
    valor: 100.00,                            // Number
    timestamp: "2025-10-20T16:29:35.657Z"    // String ISO
}
```

### URLs Importantes

- **WSS:** `wss://alivepro.net`
- **HTTPS:** `https://alivepro.net`
- **Emulador:** `https://alivepro.net/`
- **API Teste:** `POST https://alivepro.net/api/emulate-pix`

---

**Data da última atualização:** 20/10/2025  
**Versão do Documento:** 1.1 (WSS - WebSocket Secure)

