export function createLogger(target) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;

  function append(message) {
    if (!element) return;
    const paragraph = document.createElement('p');
    paragraph.textContent = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
    element.appendChild(paragraph);
    element.scrollTop = element.scrollHeight;
  }

  return {
    clear() {
      if (element) {
        element.textContent = '';
      }
    },
    log(message) {
      console.log(message);
      append(message);
    }
  };
}
