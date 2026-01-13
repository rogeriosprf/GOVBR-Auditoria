export function renderTimeline(container, history, pointer, onSelect) {
  if (!container) return;

  container.innerHTML = history.map((item, idx) => {
    const active = idx === pointer ? 'border-blue-500 bg-blue-50' : 'border-slate-200';
    const label = item.action?.type || 'INIT';

    return `
      <div 
        data-idx="${idx}"
        class="timeline-item border ${active} rounded p-2 mb-1 text-xs cursor-pointer hover:bg-slate-100"
      >
        <div class="font-mono font-bold">${label}</div>
        <div class="text-[10px] text-slate-500">
          ${new Date(item.ts).toLocaleTimeString()}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.timeline-item').forEach(el => {
    el.addEventListener('click', () => {
      onSelect(Number(el.dataset.idx));
    });
  });
}
