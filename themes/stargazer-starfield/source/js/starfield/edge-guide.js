// Keep DOM presentation separate from the navigation geometry calculated each frame.
export function createEdgeGuide(element, activate) {
  let articleId = null;
  element.onclick = () => activate(articleId);

  return {
    present(state) {
      if (!state) {
        if (!element.hidden) element.hidden = true;
        return;
      }
      articleId = state.articleId;
      for (const [property, value] of Object.entries({
        left: state.left, top: state.top, transform: 'translate(-50%,-50%)',
      })) {
        if (element.style[property] !== value) element.style[property] = value;
      }
      if (element.textContent !== state.text) element.textContent = state.text;
      if (element.hidden) element.hidden = false;
    },
  };
}
