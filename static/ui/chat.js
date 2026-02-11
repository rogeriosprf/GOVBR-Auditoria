// static/ui/chat.js
import { api } from '../services/api.js';

let currentViagemId = null;
let currentChatRequestId = 0;
let chatWindow = null;
let input = null;
let sendBtn = null;
let currentBotBubble = null;
let chatBound = false;

function ensureChatElements() {
  chatWindow = chatWindow || document.getElementById('chat-window');
  input = input || document.getElementById('user-input');
  sendBtn = sendBtn || document.getElementById('send-btn');
  return Boolean(chatWindow && input && sendBtn);
}

function addMessage(text, from = 'user') {
  if (!ensureChatElements()) return null;

  // Wrapper para alinhar a mensagem e o rótulo
  const wrapper = document.createElement('div');
  wrapper.className = `flex flex-col ${from === 'user' ? 'items-end' : 'items-start'} mb-5 animate-slideUp`;

  // Rótulo superior (Auditor ou SIAV)
  const label = document.createElement('p');
  label.className = `text-[8px] font-black uppercase mb-1 tracking-[0.15em] ${from === 'user' ? 'text-blue-400 mr-1' : 'text-slate-300 ml-1'}`;
  label.innerText = from === 'user' ? 'Auditor' : 'SIAV Engine';

  // Bolha de fala
  const bubble = document.createElement('div');
  bubble.className = `
      px-4 py-3 text-[11px] leading-relaxed max-w-[85%] rounded-2xl shadow-sm transition-all
      ${from === 'user'
      ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10 font-medium'
      : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none font-light'}
    `;
  bubble.textContent = text;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);

  // Scroll suave para o fim
  chatWindow.scrollTo({
    top: chatWindow.scrollHeight,
    behavior: 'smooth'
  });

  return bubble;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function addInsightBlocksMessage(blocos = {}) {
  if (!ensureChatElements()) return;

  const achado = escapeHtml(blocos.achado || 'Sem leitura do achado.');
  const causas = Array.isArray(blocos.causas) ? blocos.causas : [];
  const validacoes = Array.isArray(blocos.validacoes) ? blocos.validacoes : [];

  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col items-start mb-5 animate-slideUp';

  const label = document.createElement('p');
  label.className = 'text-[8px] font-black uppercase mb-1 tracking-[0.15em] text-slate-300 ml-1';
  label.innerText = 'SIAV Engine';

  const bubble = document.createElement('div');
  bubble.className = 'px-4 py-3 text-[11px] leading-relaxed max-w-[95%] rounded-2xl shadow-sm transition-all bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none font-light space-y-2';
  bubble.innerHTML = `
      <div class="rounded-xl border border-blue-100 bg-blue-50/60 p-2">
        <p class="text-[9px] font-black uppercase tracking-wider text-blue-700 mb-1">1) Leitura do Achado</p>
        <p>${achado}</p>
      </div>
      <div class="rounded-xl border border-amber-100 bg-amber-50/60 p-2">
        <p class="text-[9px] font-black uppercase tracking-wider text-amber-700 mb-1">2) Possíveis Causas</p>
        <ul class="list-disc pl-4 space-y-1">
          ${(causas.slice(0, 3).map(item => `<li>${escapeHtml(item)}</li>`).join('')) || '<li>Sem causas informadas.</li>'}
        </ul>
      </div>
      <div class="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2">
        <p class="text-[9px] font-black uppercase tracking-wider text-emerald-700 mb-1">3) Validações Recomendadas</p>
        <ul class="list-disc pl-4 space-y-1">
          ${(validacoes.slice(0, 3).map(item => `<li>${escapeHtml(item)}</li>`).join('')) || '<li>Sem validações informadas.</li>'}
        </ul>
      </div>
    `;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

function showLoading() {
  currentBotBubble = addMessage('Pensando...', 'bot');
  currentBotBubble?.classList.add('animate-pulse');
}

function hideLoading() {
  if (currentBotBubble && currentBotBubble.closest('.flex')) {
    currentBotBubble.closest('.flex').remove();
    currentBotBubble = null;
  }
}

function sendMessage({ silent = false, forceText = null, idViagem = undefined, userText = null } = {}) {
  if (!ensureChatElements()) return;
  const text = (forceText ?? input.value).trim();
  if (!text) return;

  if (!silent) {
    addMessage(userText || text, 'user');
  }
  input.value = '';
  hideLoading();
  showLoading();

  const requestId = ++currentChatRequestId;
  const contextoId = idViagem === undefined ? currentViagemId : idViagem;
  api.perguntarIA(text, contextoId)
    .then(data => {
      if (requestId !== currentChatRequestId) return;
      hideLoading();
      const resposta = data.resposta || 'Desculpe, não consegui processar sua pergunta.';
      addMessage(resposta, 'bot');
    })
    .catch(err => {
      if (requestId !== currentChatRequestId) return;
      hideLoading();
      console.error('Erro no chat:', err);
      addMessage('⚠️ Erro ao conectar com a IA. Verifique se o sistema está configurado corretamente.', 'bot');
    });
}

function analyzeCaseById(viagemId) {
  if (!viagemId) return;
  hideLoading();
  showLoading();
  const requestId = ++currentChatRequestId;

  api.analisarCasoIA(viagemId)
    .then(data => {
      if (requestId !== currentChatRequestId) return;
      hideLoading();
      const resposta = data.resposta || 'Desculpe, não consegui analisar este caso.';
      addMessage(resposta, 'bot');
    })
    .catch(err => {
      if (requestId !== currentChatRequestId) return;
      hideLoading();
      console.error('Erro na análise automática do caso:', err);
      addMessage('⚠️ Erro ao analisar este caso automaticamente.', 'bot');
    });
}

export function chatSetViagemContext(viagemId) {
  if (!ensureChatElements()) return;
  if (currentViagemId === viagemId) return;
  currentViagemId = viagemId;
  chatWindow.innerHTML = '';
  if (viagemId) {
    addMessage(`🔍 Analisando viagem ID: ${viagemId}. Faça perguntas sobre esta viagem específica.`, 'bot');
  } else {
    addMessage('👋 Olá! Sou sua assistente de auditoria. Como posso ajudar na triagem hoje?', 'bot');
  }
}

export function chatAsk(text) {
  if (!text) return;
  sendMessage({ silent: true, forceText: text });
}

export function chatAnalyzeInsight(insight = {}) {
  if (!ensureChatElements()) return;
  const titulo = insight.titulo || 'Insight';
  // Insight não deve herdar contexto de caso selecionado anteriormente.
  currentViagemId = null;
  addMessage(`Analise o insight: ${titulo}`, 'user');
  hideLoading();
  showLoading();
  const requestId = ++currentChatRequestId;

  api.analisarInsightIA(insight)
    .then(data => {
      if (requestId !== currentChatRequestId) return;
      hideLoading();
      if (data?.blocos) {
        addInsightBlocksMessage(data.blocos);
        return;
      }
      const resposta = data?.resposta || 'Desculpe, não consegui analisar este insight.';
      addMessage(resposta, 'bot');
    })
    .catch(err => {
      if (requestId !== currentChatRequestId) return;
      hideLoading();
      console.error('Erro na análise de insight:', err);
      addMessage('⚠️ Erro ao analisar este insight automaticamente.', 'bot');
    });
}

export function chatAnalyzeCase(viagemId) {
  if (!viagemId) return;
  if (currentViagemId !== viagemId) {
    chatSetViagemContext(viagemId);
  }
  analyzeCaseById(viagemId);
}

export function chatAddMessage(text, from = 'bot') {
  addMessage(text, from);
}

export function setupChat() {
  if (!ensureChatElements()) {
    console.warn('⚠️ Elementos do chat não encontrados no DOM');
    return;
  }

  // ========================
  // EVENTOS
  // ========================
  if (!chatBound) {
    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    chatBound = true;
  }

  // Limpar chat inicial e dar as boas-vindas
  chatWindow.innerHTML = '';
  addMessage('👋 Olá! Sou sua assistente de auditoria. Como posso ajudar na triagem hoje?', 'bot');

  console.log('✅ Chat inicializado com design Navy/Slate');
}
