export function reducer(state, action) {
  switch (action.type) {

    case 'SET_CARDS':
      return {
        ...state,
        cards: action.payload
      };

    case 'OPEN_MODAL':
      return {
        ...state,
        modal: {
          aberto: true,
          payload: action.payload
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

    case 'SET_FILTRO':
      return {
        ...state,
        filtros: {
          ...state.filtros,
          ...action.payload
        }
      };

    default:
      return state;
  }
}
