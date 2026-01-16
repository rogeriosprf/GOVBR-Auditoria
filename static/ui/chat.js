// static/ui/chat.js

let currentViagemId = null;

export function setupChat() {
  const chatWindow = document.getElementById('chat-window');
  const input = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');

  if (!chatWindow || !input || !sendBtn) {
    console.warn('⚠️ Elementos do chat não encontrados no DOM');
    return;
  }

  let currentBotBubble = null;

  function addMessage(text, from = 'user') {
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

  function showLoading() {
    currentBotBubble = addMessage('Processando evidências...', 'bot');
    currentBotBubble.classList.add('animate-pulse');
  }

  function hideLoading() {
    if (currentBotBubble && currentBotBubble.closest('.flex')) {
      currentBotBubble.closest('.flex').remove();
      currentBotBubble = null;
    }
  }

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';
    showLoading();

    // Chamada real à API com contexto da viagem
    const payload = { mensagem: text };
    if (currentViagemId) {
      payload.id_viagem = currentViagemId;
    }

    fetch('/api/auditoria/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        hideLoading();
        const resposta = data.resposta || 'Desculpe, não consegui processar sua pergunta.';
        addMessage(resposta, 'bot');
      })
      .catch(err => {
        hideLoading();
        console.error('Erro no chat:', err);
        addMessage('⚠️ Erro ao conectar com a IA. Verifique se o sistema está configurado corretamente.', 'bot');
      });
  }

  // ========================
  // EVENTOS
  // ========================
  sendBtn.addEventListener('click', sendMessage);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Limpar chat inicial e dar as boas-vindas
  chatWindow.innerHTML = '';
  addMessage('👋 Olá! Sou sua assistente de auditoria. Como posso ajudar na triagem hoje?', 'bot');

  console.log('✅ Chat inicializado com design Navy/Slate');

  // Expor função para atualizar contexto
  window.chatSetViagemContext = function (viagemId) {
    currentViagemId = viagemId;
    chatWindow.innerHTML = '';
    if (viagemId) {
      addMessage(`🔍 Analisando viagem ID: ${viagemId}. Faça perguntas sobre esta viagem específica.`, 'bot');
    } else {
      addMessage('👋 Olá! Sou sua assistente de auditoria. Como posso ajudar na triagem hoje?', 'bot');
    }
  };
}

// API pública atualizada para o novo design
window.chatUI = {
  addMessage: (text, from = 'bot') => {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;

    const wrapper = document.createElement('div');
    wrapper.className = `flex flex-col ${from === 'user' ? 'items-end' : 'items-start'} mb-5 animate-slideUp`;

    const label = document.createElement('p');
    label.className = `text-[8px] font-black uppercase mb-1 tracking-[0.15em] ${from === 'user' ? 'text-blue-400 mr-1' : 'text-slate-300 ml-1'}`;
    label.innerText = from === 'user' ? 'Auditor' : 'SIAV Engine';

    const bubble = document.createElement('div');
    bubble.className = `px-4 py-3 text-[11px] leading-relaxed max-w-[85%] rounded-2xl shadow-sm ${from === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none'
      }`;
    bubble.textContent = text;

    wrapper.appendChild(label);
    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
};