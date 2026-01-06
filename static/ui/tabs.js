export function setupTabs() {
  const homeTab = document.getElementById('tab-home')
  const cardsTab = document.getElementById('tab-cards')
  const tabTitle = document.getElementById('tab-title')
  const tabDesc = document.getElementById('tab-desc')

  document.getElementById('btn-home').onclick = () => {
    homeTab.classList.remove('hidden')
    cardsTab.classList.add('hidden')
    // ensure other tabs are hidden
    document.getElementById('tab-dashboard')?.classList.add('hidden')
    document.getElementById('tab-settings')?.classList.add('hidden')
    tabTitle.innerText = 'Home'
    tabDesc.innerText = 'Visão Geral'
  }

  document.getElementById('btn-cards').onclick = () => {
    homeTab.classList.add('hidden')
    cardsTab.classList.remove('hidden')
    // hide dashboard & settings when showing cards
    document.getElementById('tab-dashboard')?.classList.add('hidden')
    document.getElementById('tab-settings')?.classList.add('hidden')
    tabTitle.innerText = 'Auditorias'
    tabDesc.innerText = 'Triagem de Casos'
  }

  document.getElementById('btn-dashboard').onclick = () => {
    homeTab.classList.add('hidden')
    cardsTab.classList.add('hidden')
    // hide settings in case it was previously open
    document.getElementById('tab-settings')?.classList.add('hidden')
    const dash = document.getElementById('tab-dashboard')
    if (dash) dash.classList.remove('hidden')
    tabTitle.innerText = 'Dashboard'
    tabDesc.innerText = 'Métricas e ranking'
    if (window.loadDashboard) window.loadDashboard()
  }

  document.getElementById('btn-settings').onclick = () => {
    homeTab.classList.add('hidden')
    cardsTab.classList.add('hidden')
    document.getElementById('tab-dashboard')?.classList.add('hidden')
    const settings = document.getElementById('tab-settings')
    if (settings) settings.classList.remove('hidden')
    tabTitle.innerText = 'Configurações'
    tabDesc.innerText = 'Ajustes do sistema'
    if (window.loadSettings) window.loadSettings()
  }
}
