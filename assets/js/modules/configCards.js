import { getStoredValue, setStoredValue } from './storage.js';

export function renderConfigCards(container, sections) {
  if (!container) {
    return new Map();
  }

  container.innerHTML = '';
  const cards = new Map();

  sections.forEach(section => {
    const card = document.createElement('article');
    card.className = 'config-card';
    card.id = section.id;

    const header = document.createElement('div');
    header.className = 'config-card__header';

    const title = document.createElement('h2');
    title.className = 'config-card__title';
    title.textContent = section.title;
    header.appendChild(title);

    if (section.platform) {
      const link = document.createElement('a');
      link.className = 'config-card__link';
      link.href = section.platform.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = section.platform.name;
      header.appendChild(link);
    }

    card.appendChild(header);

    if (section.description) {
      const description = document.createElement('p');
      description.className = 'config-card__description';
      description.textContent = section.description;
      card.appendChild(description);
    }

    if (section.usage?.length) {
      const usage = document.createElement('div');
      usage.className = 'config-card__usage';
      section.usage.forEach(entry => {
        const chip = document.createElement('span');
        chip.className = 'config-usage-chip';
        chip.textContent = entry;
        usage.appendChild(chip);
      });
      card.appendChild(usage);
    }

    const fieldsWrapper = document.createElement('div');
    fieldsWrapper.className = 'config-card__fields';

    const inputs = [];
    section.fields.forEach(field => {
      const label = document.createElement('label');
      label.className = 'config-card__field';
      label.htmlFor = field.id;
      label.textContent = field.label;

      const input = document.createElement(field.multiline ? 'textarea' : 'input');
      input.id = field.id;
      input.name = field.id;
      input.type = field.type || 'text';
      input.placeholder = field.placeholder || '';
      input.dataset.storageKey = field.storageKey;
      input.value = getStoredValue(field.storageKey, '');
      input.autocomplete = field.autocomplete || 'off';
      if (field.maxLength) input.maxLength = field.maxLength;
      if (field.spellcheck === false) input.spellcheck = false;

      label.appendChild(input);
      fieldsWrapper.appendChild(label);
      inputs.push(input);
    });

    card.appendChild(fieldsWrapper);

    const actions = document.createElement('div');
    actions.className = 'config-card__actions';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'button button--accent';
    saveButton.textContent = section.saveLabel || 'Speichern';
    actions.appendChild(saveButton);

    const status = document.createElement('span');
    status.className = 'config-card__status';
    status.role = 'status';
    status.setAttribute('aria-live', 'polite');
    actions.appendChild(status);

    card.appendChild(actions);

    saveButton.addEventListener('click', () => {
      inputs.forEach(input => {
        const key = input.dataset.storageKey;
        if (!key) return;
        setStoredValue(key, input.value.trim());
      });
      status.textContent = 'Gespeichert.';
      card.classList.add('config-card--saved');
      window.setTimeout(() => card.classList.remove('config-card--saved'), 700);
      window.setTimeout(() => {
        if (status.textContent === 'Gespeichert.') {
          status.textContent = '';
        }
      }, 3200);
    });

    inputs.forEach(input => {
      input.addEventListener('input', () => {
        status.textContent = '';
      });
    });

    container.appendChild(card);
    cards.set(section.id, { element: card, inputs, status });
  });

  return cards;
}
