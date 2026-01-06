export function setupChat() {
  const chatWindow = document.getElementById('chat-window')
  const input = document.getElementById('user-input')
  const sendBtn = document.getElementById('send-btn')

  function addMessage(text, from='user') {
    const div = document.createElement('div')
    div.className = from === 'user' ? 'text-right' : 'text-left'
    div.innerHTML = `<span class="px-3 py-1 rounded-lg ${from==='user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-slate-700'}">${text}</span>`
    chatWindow.appendChild(div)
    chatWindow.scrollTop = chatWindow.scrollHeight
  }

  sendBtn.onclick = () => {
    const text = input.value.trim()
    if (!text) return
    addMessage(text, 'user')
    input.value = ''
    setTimeout(() => addMessage('Resposta automatizada do Llama 3.3', 'bot'), 500)
  }

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click()
  })
}
