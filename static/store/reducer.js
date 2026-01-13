export function reducer(state, action) {
  switch (action.type) {

    case 'SET_CARDS':
      return {
        ...state,
        cards: action.payload
      };

    // Suporta tanto SET_FILTRO quanto SET_FILTROS
    case 'SET_FILTRO':
    case 'SET_FILTROS':
      return {
        ...state,
        filtros: {
          ...state.filtros,
          ...action.payload
        }
      };

    case 'OPEN_MODAL':
      return {
        ...state,
        modal: {
          aberto: true,
          // Se o payload já existe e estamos apenas enriquecendo com detalhes, 
          // fazemos o merge para não perder os dados básicos do card.
          payload: state.modal.payload && action.payload?.id_viagem === state.modal.payload?.id_viagem
            ? { ...state.modal.payload, ...action.payload }
            : action.payload
        }
      };

    case 'CLOSE_MODAL':
      return {
        ...state,
        modal: {
          aberto: false,
          payload: null
        }
      };

    case 'SET_STATS':
      return {
        ...state,
        stats: action.payload
      };

    default:
      return state;
  }
}