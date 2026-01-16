// static/ui/tabs.js (ou onde você tem setupTabs)
export function setupTabs() {
  const title = document.getElementById('tab-title');
  const desc = document.getElementById('tab-desc');

  const tabs = {
    home: {
      button: 'btn-home',
      section: 'tab-home',
      title: 'Home',
      desc: 'Visão Geral',
      onShow: () => window.initHomeLanding?.()
    },
    cards: {
      button: 'btn-cards',
      section: 'tab-cards',
      title: 'Auditorias',
      desc: 'Triagem de Casos'
    },
    dashboard: {
      button: 'btn-dashboard',
      section: 'tab-dashboard',
      title: 'Dashboard',
      desc: 'Métricas e ranking',
      onShow: () => window.initDashboard?.()
    },
    settings: {
      button: 'btn-settings',
      section: 'tab-settings',
      title: 'Configurações',
      desc: 'Ajustes do sistema',
      onShow: () => window.loadSettings?.()
    }
  };

  // Todas as sections
  const sections = Object.values(tabs).map(t => document.getElementById(t.section)).filter(Boolean);

  // Todos os botões da sidebar
  const buttons = Object.values(tabs).map(t => document.getElementById(t.button)).filter(Boolean);

  function hideAll() {
    sections.forEach(sec => sec.classList.add('hidden'));
    buttons.forEach(btn => {
      btn.classList.remove('text-blue-600', 'bg-blue-50');
      btn.classList.add('text-slate-300');
    });
  }

  function showTab(key) {
    const tab = tabs[key];
    if (!tab) return;

    hideAll();

    const section = document.getElementById(tab.section);
    const button = document.getElementById(tab.button);

    if (section) section.classList.remove('hidden');
    if (button) {
      button.classList.remove('text-slate-300');
      button.classList.add('text-blue-600', 'bg-blue-50');
    }

    if (title) title.innerText = tab.title;
    if (desc) desc.innerText = tab.desc;

    tab.onShow?.();
  }

  // Bind nos botões
  Object.entries(tabs).forEach(([key, tab]) => {
    const btn = document.getElementById(tab.button);
    if (btn) {
      btn.addEventListener('click', () => showTab(key));
    }
  });

  // Estado inicial: Home ativo
  showTab('home');
}