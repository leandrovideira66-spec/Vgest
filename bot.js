const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let client = null;
let qrCodeData = null;

// Servir página com QR Code
app.get('/', (req, res) => {
    if (qrCodeData) {
        res.send(`
            <html>
            <head><title>WhatsApp Kiesse Bot</title></head>
            <body style="text-align:center; font-family:sans-serif; padding:20px;">
                <h1>🤖 Kiesse Bot - Videira's Assessoria</h1>
                <p>Escaneie o QR Code com o WhatsApp da Videira's</p>
                <img src="${qrCodeData}" style="max-width:300px; border:1px solid #ccc; border-radius:10px;">
                <p style="margin-top:20px; color:green;">✅ Bot ativo! Aguardando conexão...</p>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <html>
            <head><title>WhatsApp Kiesse Bot</title></head>
            <body style="text-align:center; font-family:sans-serif; padding:20px;">
                <h1>🤖 Kiesse Bot - Videira's Assessoria</h1>
                <p>${client && client.info ? '✅ Bot conectado! Envie mensagens para o WhatsApp da Videira\'s.' : '⏳ Aguardando QR Code... Atualize a página em alguns segundos.'}</p>
            </body>
            </html>
        `);
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

async function chamarGemini(prompt) {
    if (!GEMINI_API_KEY) return "⚠️ IA não configurada.";
    try {
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui processar.";
    } catch (error) {
        return "Erro de conexão com a IA.";
    }
}

// Inicializar cliente WhatsApp
client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('QR Code recebido');
    qrcode.generate(qr, { small: true });
    qrCodeData = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
});

client.on('ready', () => {
    console.log('✅ Bot Kiesse está online!');
    qrCodeData = null;
});

client.on('message', async (message) => {
    const texto = message.body;
    console.log(`Mensagem recebida: ${texto}`);
    
    if (texto.startsWith('!ia') || texto.startsWith('!IA')) {
        const pergunta = texto.substring(4).trim();
        if (!pergunta) {
            await message.reply('🤖 Kiesse: Envie sua pergunta após !ia\nExemplo: !ia Como abrir uma empresa em Luanda?');
            return;
        }
        
        await message.reply('🤖 Kiesse está pensando... ⏳');
        
        const prompt = `Você é a Kiesse, assistente inteligente da Videira's Assessoria Empresarial. Você é simpática, profissional e ajuda comerciantes em Angola com questões sobre constituição de empresas, alvarás, NIF, gestão de negócios e uso do sistema V-Gest. Responda sempre em português de Angola, de forma clara e objetiva. Se não souber algo, ofereça ajuda do suporte humano: WhatsApp 954 289 109\n\nPergunta: ${pergunta}`;
        
        const resposta = await chamarGemini(prompt);
        await message.reply(`🤖 Kiesse: ${resposta}`);
    } else if (texto === '!ping') {
        await message.reply('🏓 Pong! Bot Kiesse está ativo!');
    } else if (texto === '!help') {
        await message.reply('🤖 Comandos disponíveis:\n!ia [pergunta] - Pergunte algo para Kiesse\n!ping - Verificar se bot está ativo\n!help - Mostrar este menu');
    } else {
        await message.reply('🤖 Olá! Sou a Kiesse, assistente da Videira\'s. Use o comando !ia seguido da sua pergunta.\nExemplo: !ia Como faço para abrir uma empresa?');
    }
});

client.initialize();
