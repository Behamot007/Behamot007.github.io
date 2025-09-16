(() => {
  'use strict';

  const state = {
    persons: [],
    expenses: [],
  };

  const PERSON_COLORS = [
    '#4ecdc4',
    '#ff9f6e',
    '#7c83ff',
    '#f6c453',
    '#9b5de5',
    '#00bbf0',
    '#ff6f91',
    '#6ee7b7',
    '#f97316',
    '#5eead4',
  ];

  const searchParams = new URLSearchParams(window.location.search);
  const showExperimental = searchParams.has('receiptAI');

  const personForm = document.getElementById('personForm');
  const personNameInput = document.getElementById('personName');
  const personFeedbackEl = document.getElementById('personFeedback');
  const personListEl = document.getElementById('personList');

  const expenseForm = document.getElementById('expenseForm');
  const expenseNameInput = document.getElementById('expenseName');
  const expenseAmountInput = document.getElementById('expenseAmount');
  const expenseParticipantsEl = document.getElementById('expenseParticipants');
  const expenseFeedbackEl = document.getElementById('expenseFeedback');
  const expenseListEl = document.getElementById('expenseList');
  const expenseResetBtn = document.getElementById('expenseResetBtn');

  const summaryEmptyEl = document.getElementById('summaryEmpty');
  const summaryTableWrapperEl = document.getElementById('summaryTableWrapper');
  const summaryBodyEl = document.getElementById('summaryBody');
  const personBreakdownEl = document.getElementById('personBreakdown');
  const summaryTotalsEl = document.getElementById('summaryTotals');
  const totalsActualEl = document.getElementById('totalsActual');
  const totalsRoundedEl = document.getElementById('totalsRounded');
  const roundingDifferenceEl = document.getElementById('roundingDifference');
  const roundingNoteEl = document.getElementById('roundingNote');
  const unassignedInfoEl = document.getElementById('unassignedInfo');

  const experimentalSection = document.getElementById('experimentalSection');
  const receiptInput = document.getElementById('receiptInput');
  const analyzeReceiptBtn = document.getElementById('analyzeReceiptBtn');
  const experimentalStatusEl = document.getElementById('experimentalStatus');

  const currencyFormatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });

  const preciseFormatter = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  const DEFAULT_EXPERIMENTAL_HINT =
    'Füge Personen hinzu, damit Vorschläge zur Zuordnung gemacht werden können.';

  let receiptFile = null;
  let isAnalyzing = false;

  if (experimentalSection) {
    experimentalSection.hidden = !showExperimental;
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getInitials(name) {
    return name
      .trim()
      .split(/\s+/)
      .map(part => part[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function assignColor(index) {
    return PERSON_COLORS[index % PERSON_COLORS.length];
  }

  function setFeedback(element, message, type = 'info') {
    if (!element) return;
    element.textContent = message || '';
    if (message) {
      element.dataset.type = type;
    } else {
      delete element.dataset.type;
    }
  }

  function normalizeAmountInput(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, '').replace(',', '.');
  }

  function parseEuroToCents(value) {
    const normalized = normalizeAmountInput(value);
    if (!normalized) {
      return null;
    }
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount < 0) {
      return null;
    }
    return Math.round(amount * 100);
  }

  function centsToEuro(cents) {
    return cents / 100;
  }

  function roundUpToCents(value) {
    return Math.ceil(value * 100 - 1e-9) / 100;
  }

  function roundToCents(value) {
    return Math.round((value + Number.EPSILON) * 100);
  }

  function formatCurrency(value) {
    return currencyFormatter.format(value);
  }

  function formatPreciseEuro(value) {
    return `${preciseFormatter.format(value)} €`;
  }

  function updateAnalyzeButtonState() {
    if (!analyzeReceiptBtn) return;
    analyzeReceiptBtn.disabled = !showExperimental || !receiptFile || state.persons.length === 0 || isAnalyzing;
  }

  function updateExperimentalDefaultMessage() {
    if (!showExperimental || !experimentalStatusEl) return;
    if (state.persons.length === 0) {
      if (
        !experimentalStatusEl.textContent ||
        experimentalStatusEl.textContent === DEFAULT_EXPERIMENTAL_HINT
      ) {
        setFeedback(experimentalStatusEl, DEFAULT_EXPERIMENTAL_HINT, 'info');
      }
    } else if (experimentalStatusEl.textContent === DEFAULT_EXPERIMENTAL_HINT) {
      setFeedback(experimentalStatusEl, '', 'info');
    }
  }

  function addPerson(name) {
    const trimmed = name.trim();
    if (!trimmed) {
      setFeedback(personFeedbackEl, 'Bitte einen Namen eingeben.', 'error');
      return;
    }

    if (trimmed.length > 40) {
      setFeedback(personFeedbackEl, 'Bitte einen kürzeren Namen wählen.', 'error');
      return;
    }

    const exists = state.persons.some(person => person.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setFeedback(personFeedbackEl, `${trimmed} ist bereits vorhanden.`, 'warning');
      return;
    }

    const person = {
      id: generateId(),
      name: trimmed,
      color: assignColor(state.persons.length),
    };

    state.persons.push(person);
    setFeedback(personFeedbackEl, `${person.name} hinzugefügt.`, 'success');
    personNameInput.value = '';
    personNameInput.focus();
    renderPersons();
    renderParticipantSelector();
    renderExpenses();
    renderSummary();
    updateAnalyzeButtonState();
    if (showExperimental && experimentalStatusEl) {
      if (experimentalStatusEl.textContent === DEFAULT_EXPERIMENTAL_HINT) {
        setFeedback(experimentalStatusEl, '', 'info');
      }
    }
    updateExperimentalDefaultMessage();
  }

  function removePerson(personId) {
    const index = state.persons.findIndex(person => person.id === personId);
    if (index === -1) return;
    const [removed] = state.persons.splice(index, 1);
    state.expenses.forEach(expense => expense.participantIds.delete(personId));
    setFeedback(personFeedbackEl, `${removed.name} entfernt.`, 'info');
    renderPersons();
    renderParticipantSelector();
    renderExpenses();
    renderSummary();
    updateAnalyzeButtonState();
    updateExperimentalDefaultMessage();
  }

  function addExpense(form) {
    if (state.persons.length === 0) {
      setFeedback(expenseFeedbackEl, 'Lege zuerst Personen an.', 'error');
      return;
    }

    const name = expenseNameInput.value.trim();
    const amountCents = parseEuroToCents(expenseAmountInput.value);
    const formData = new FormData(form);
    const participants = new Set(formData.getAll('participants'));

    if (!name) {
      setFeedback(expenseFeedbackEl, 'Bitte eine Beschreibung angeben.', 'error');
      return;
    }

    if (amountCents === null || amountCents === undefined) {
      setFeedback(expenseFeedbackEl, 'Bitte einen gültigen Betrag eingeben.', 'error');
      return;
    }

    if (amountCents === 0) {
      setFeedback(expenseFeedbackEl, 'Der Betrag muss größer als 0 sein.', 'error');
      return;
    }

    const expense = {
      id: generateId(),
      label: name,
      amountCents,
      participantIds: participants,
    };

    state.expenses.push(expense);
    form.reset();
    setFeedback(expenseFeedbackEl, `Ausgabe „${name}” gespeichert.`, 'success');
    renderExpenses();
    renderSummary();
    updateAnalyzeButtonState();
  }

  function removeExpense(expenseId) {
    const index = state.expenses.findIndex(expense => expense.id === expenseId);
    if (index === -1) return;
    const [removed] = state.expenses.splice(index, 1);
    setFeedback(expenseFeedbackEl, `Ausgabe „${removed.label}” entfernt.`, 'info');
    renderExpenses();
    renderSummary();
    updateAnalyzeButtonState();
  }

  function toggleExpenseParticipant(expenseId, personId) {
    const expense = state.expenses.find(item => item.id === expenseId);
    if (!expense) return;
    if (expense.participantIds.has(personId)) {
      expense.participantIds.delete(personId);
    } else {
      expense.participantIds.add(personId);
    }
    renderExpenses();
    renderSummary();
    updateAnalyzeButtonState();
  }

  function renderPersons() {
    if (!personListEl) return;
    personListEl.innerHTML = '';

    if (state.persons.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Noch keine Personen hinzugefügt.';
      personListEl.appendChild(empty);
      return;
    }

    state.persons.forEach(person => {
      const item = document.createElement('div');
      item.className = 'person-chip';
      item.setAttribute('role', 'listitem');
      item.style.setProperty('--chip-color', person.color);

      const avatar = document.createElement('span');
      avatar.className = 'person-chip__avatar';
      avatar.textContent = getInitials(person.name);

      const name = document.createElement('span');
      name.className = 'person-chip__name';
      name.textContent = person.name;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'person-chip__remove';
      removeBtn.dataset.removePerson = person.id;
      removeBtn.setAttribute('aria-label', `${person.name} entfernen`);
      removeBtn.innerHTML = '<span aria-hidden="true">×</span>';

      item.append(avatar, name, removeBtn);
      personListEl.appendChild(item);
    });
  }

  function renderParticipantSelector() {
    if (!expenseParticipantsEl) return;
    expenseParticipantsEl.innerHTML = '';

    if (state.persons.length === 0) {
      const note = document.createElement('p');
      note.className = 'participant-selector__empty';
      note.textContent = 'Lege zuerst Personen an, um Ausgaben zuzuordnen.';
      expenseParticipantsEl.appendChild(note);
      return;
    }

    state.persons.forEach(person => {
      const label = document.createElement('label');
      label.className = 'person-checkbox';
      label.style.setProperty('--chip-color', person.color);

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'person-checkbox__input';
      input.name = 'participants';
      input.value = person.id;

      const text = document.createElement('span');
      text.className = 'person-checkbox__label';
      text.textContent = person.name;

      label.append(input, text);
      expenseParticipantsEl.appendChild(label);
    });
  }

  function renderExpenses() {
    if (!expenseListEl) return;
    expenseListEl.innerHTML = '';

    if (state.expenses.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Noch keine Ausgaben erfasst.';
      expenseListEl.appendChild(empty);
      return;
    }

    state.expenses.forEach(expense => {
      const card = document.createElement('article');
      card.className = 'expense-card';
      card.setAttribute('role', 'listitem');
      card.dataset.expenseId = expense.id;

      const header = document.createElement('div');
      header.className = 'expense-card__header';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'expense-card__meta';

      const title = document.createElement('h3');
      title.className = 'expense-card__title';
      title.textContent = expense.label;

      const amount = document.createElement('span');
      amount.className = 'expense-card__amount';
      amount.textContent = formatCurrency(centsToEuro(expense.amountCents));

      titleWrap.append(title, amount);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'button button--secondary';
      removeBtn.dataset.removeExpense = expense.id;
      removeBtn.textContent = 'Entfernen';

      header.append(titleWrap, removeBtn);

      const tags = document.createElement('div');
      tags.className = 'expense-card__tags';

      state.persons.forEach(person => {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'tag-toggle';
        toggle.dataset.personId = person.id;
        toggle.dataset.expenseId = expense.id;
        toggle.textContent = person.name;
        toggle.style.setProperty('--tag-color', person.color);
        if (expense.participantIds.has(person.id)) {
          toggle.classList.add('tag-toggle--active');
        }
        tags.appendChild(toggle);
      });

      const fragments = [header, tags];

      if (expense.participantIds.size === 0) {
        const hint = document.createElement('p');
        hint.className = 'expense-card__hint';
        hint.textContent = 'Noch keiner Person zugeordnet.';
        fragments.push(hint);
      } else {
        const shareEuro = centsToEuro(expense.amountCents / expense.participantIds.size);
        const share = document.createElement('p');
        share.className = 'expense-card__share';
        share.textContent = `Zwischenanteil pro Person: ${formatPreciseEuro(shareEuro)}`;
        fragments.push(share);
      }

      fragments.forEach(fragment => card.appendChild(fragment));
      expenseListEl.appendChild(card);
    });
  }

  function calculateTotals() {
    const perPerson = state.persons.map(person => ({
      person,
      rawShare: 0,
      contributions: [],
    }));

    const perPersonMap = new Map(perPerson.map(entry => [entry.person.id, entry]));

    let totalExpenseCents = 0;
    let assignedExpenseCents = 0;

    state.expenses.forEach(expense => {
      totalExpenseCents += expense.amountCents;
      const participantCount = expense.participantIds.size;
      if (participantCount === 0) {
        return;
      }
      assignedExpenseCents += expense.amountCents;
      const shareEuro = centsToEuro(expense.amountCents / participantCount);
      expense.participantIds.forEach(personId => {
        const entry = perPersonMap.get(personId);
        if (!entry) return;
        entry.rawShare += shareEuro;
        entry.contributions.push({
          expenseLabel: expense.label,
          shareEuro,
          participantCount,
          totalEuro: centsToEuro(expense.amountCents),
        });
      });
    });

    perPerson.forEach(entry => {
      entry.roundedShare = roundUpToCents(entry.rawShare);
      entry.roundingDifference = entry.roundedShare - entry.rawShare;
    });

    const totalRoundedCents = perPerson.reduce((sum, entry) => sum + roundToCents(entry.roundedShare), 0);
    const totalRoundedEuro = centsToEuro(totalRoundedCents);
    const totalExpensesEuro = centsToEuro(totalExpenseCents);
    const roundingReserve = totalRoundedEuro - totalExpensesEuro;
    const unassignedEuro = centsToEuro(totalExpenseCents - assignedExpenseCents);

    return {
      perPerson,
      totals: {
        totalExpensesEuro,
        totalRoundedEuro,
        roundingReserve,
        unassignedEuro,
      },
    };
  }

  function renderSummary() {
    if (!summaryBodyEl || !summaryEmptyEl || !summaryTableWrapperEl) return;

    if (state.persons.length === 0 || state.expenses.length === 0) {
      summaryEmptyEl.hidden = false;
      summaryTableWrapperEl.hidden = true;
      summaryTotalsEl && (summaryTotalsEl.hidden = true);
      personBreakdownEl && (personBreakdownEl.innerHTML = '');
      if (unassignedInfoEl) {
        unassignedInfoEl.hidden = true;
      }
      return;
    }

    const { perPerson, totals } = calculateTotals();

    summaryEmptyEl.hidden = true;
    summaryTableWrapperEl.hidden = false;

    summaryBodyEl.innerHTML = '';
    perPerson.forEach(entry => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('th');
      nameCell.scope = 'row';
      nameCell.textContent = entry.person.name;
      nameCell.style.setProperty('color', entry.person.color);

      const rawCell = document.createElement('td');
      rawCell.textContent = formatPreciseEuro(entry.rawShare);

      const roundedCell = document.createElement('td');
      roundedCell.textContent = formatCurrency(entry.roundedShare);

      const diffCell = document.createElement('td');
      const diff = entry.roundingDifference;
      if (diff > 0) {
        diffCell.textContent = `+${formatCurrency(diff)}`;
      } else if (diff < 0) {
        diffCell.textContent = `-${formatCurrency(Math.abs(diff))}`;
      } else {
        diffCell.textContent = formatCurrency(0);
      }

      row.append(nameCell, rawCell, roundedCell, diffCell);
      summaryBodyEl.appendChild(row);
    });

    if (summaryTotalsEl && totalsActualEl && totalsRoundedEl && roundingDifferenceEl && roundingNoteEl) {
      summaryTotalsEl.hidden = false;
      totalsActualEl.textContent = formatCurrency(totals.totalExpensesEuro);
      totalsRoundedEl.textContent = formatCurrency(totals.totalRoundedEuro);

      const normalizedReserve = Math.abs(totals.roundingReserve) < 1e-8 ? 0 : totals.roundingReserve;
      if (normalizedReserve > 0) {
        roundingDifferenceEl.textContent = `+${formatCurrency(normalizedReserve)}`;
      } else if (normalizedReserve < 0) {
        roundingDifferenceEl.textContent = `-${formatCurrency(Math.abs(normalizedReserve))}`;
      } else {
        roundingDifferenceEl.textContent = formatCurrency(0);
      }

      if (normalizedReserve > 0) {
        roundingDifferenceEl.parentElement?.classList.add('summary-total--accent');
        roundingNoteEl.textContent =
          'Durch das Aufrunden entsteht eine kleine Reserve. Sie stellt sicher, dass niemand zu wenig zahlt.';
      } else if (normalizedReserve < 0) {
        roundingDifferenceEl.parentElement?.classList.add('summary-total--accent');
        roundingNoteEl.textContent =
          'Achtung: Die aufgerundeten Beträge liegen unter den tatsächlichen Kosten. Prüfe die Zuordnungen erneut.';
      } else {
        roundingDifferenceEl.parentElement?.classList.remove('summary-total--accent');
        roundingNoteEl.textContent = 'Die gerundeten Beiträge entsprechen exakt der Summe der Ausgaben.';
      }
    }

    if (personBreakdownEl) {
      personBreakdownEl.innerHTML = '';
      perPerson.forEach(entry => {
        const details = document.createElement('details');
        details.open = false;

        const summary = document.createElement('summary');
        summary.textContent = `Anteile von ${entry.person.name}`;
        summary.style.setProperty('color', entry.person.color);

        details.appendChild(summary);

        const list = document.createElement('ul');
        if (entry.contributions.length === 0) {
          const item = document.createElement('li');
          item.textContent = 'Keine Ausgaben zugeordnet.';
          list.appendChild(item);
        } else {
          entry.contributions.forEach(contribution => {
            const item = document.createElement('li');
            item.textContent = `${contribution.expenseLabel}: ${formatPreciseEuro(
              contribution.shareEuro
            )} aus ${formatCurrency(contribution.totalEuro)} (${contribution.participantCount} Personen)`;
            list.appendChild(item);
          });
        }

        details.appendChild(list);
        personBreakdownEl.appendChild(details);
      });
    }

    if (unassignedInfoEl) {
      if (totals.unassignedEuro > 0) {
        unassignedInfoEl.hidden = false;
        unassignedInfoEl.textContent = `Noch nicht zugeordnete Ausgaben: ${formatCurrency(
          totals.unassignedEuro
        )}. Diese Kosten werden aktuell niemandem berechnet.`;
      } else {
        unassignedInfoEl.hidden = true;
        unassignedInfoEl.textContent = '';
      }
    }
  }

  async function fileToBase64(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const parts = result.split(',');
        resolve(parts.length > 1 ? parts[1] : result);
      };
      reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
      reader.readAsDataURL(file);
    });
  }

  async function requestExpensePrefill(base64Image, mimeType) {
    if (typeof callAI !== 'function') {
      throw new Error('Die KI-Schnittstelle ist nicht verfügbar.');
    }

    const personNames = state.persons.map(person => person.name).join(', ') || 'keine Personen';

    const systemPrompt = `Du extrahierst Positionen aus fotografierten Kassenbons. Gib ausschließlich valides JSON zurück.
Schema:
{
  "expenses": [
    {
      "title": "Artikelname",
      "amount": 0.00,
      "suggested_participants": ["Name"]
    }
  ]
}
Regeln:
- "amount" ist der Preis pro Position in Euro mit Punkt als Dezimaltrennzeichen.
- Gib maximal 20 Positionen zurück.
- Verwende nur Namen aus der Personenliste für "suggested_participants". Wenn keine Zuordnung möglich ist, gib ein leeres Array zurück.
- Ignoriere Gesamt- oder Wechselgeld-Zeilen.`;

    const userPrompt = `Personenliste: ${personNames}.
Analysiere den folgenden Kassenbon (${mimeType}). Der Inhalt ist Base64-kodiert:
${base64Image}

Liefere das JSON gemäß Schema.`;

    return await callAI({
      systemPrompt,
      userPrompt,
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 900,
      retries: 2,
    });
  }

  function applyPrefill(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.expenses)) {
      throw new Error('Unerwartetes KI-Ergebnis.');
    }

    let added = 0;
    data.expenses.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      const title = String(entry.title || entry.name || '').trim();
      const amountNumber = Number(entry.amount);
      if (!title || !Number.isFinite(amountNumber) || amountNumber <= 0) return;

      const amountCents = Math.round(amountNumber * 100);
      const suggested = Array.isArray(entry.suggested_participants) ? entry.suggested_participants : [];
      const participants = new Set();
      suggested.forEach(label => {
        const person = state.persons.find(p => p.name.toLowerCase() === String(label).trim().toLowerCase());
        if (person) {
          participants.add(person.id);
        }
      });

      state.expenses.push({
        id: generateId(),
        label: title,
        amountCents,
        participantIds: participants,
      });
      added += 1;
    });

    if (added === 0) {
      throw new Error('Es konnten keine passenden Positionen erkannt werden.');
    }

    renderExpenses();
    renderSummary();
    updateAnalyzeButtonState();
  }

  async function handleAnalyzeReceipt() {
    if (!receiptFile) return;
    if (state.persons.length === 0) {
      setFeedback(
        experimentalStatusEl,
        'Bitte lege zunächst Personen an, damit Zuordnungen vorgeschlagen werden können.',
        'error'
      );
      return;
    }

    isAnalyzing = true;
    updateAnalyzeButtonState();
    setFeedback(experimentalStatusEl, 'Analysiere Kassenbon …', 'info');

    try {
      const base64 = await fileToBase64(receiptFile);
      const result = await requestExpensePrefill(base64, receiptFile.type || 'unbekannt');
      applyPrefill(result);
      setFeedback(
        experimentalStatusEl,
        'Die Vorschläge wurden übernommen. Bitte prüfe die Ausgaben und passe sie bei Bedarf an.',
        'success'
      );
    } catch (error) {
      setFeedback(experimentalStatusEl, error.message || 'Analyse fehlgeschlagen.', 'error');
      console.error(error);
    } finally {
      isAnalyzing = false;
      updateAnalyzeButtonState();
    }
  }

  personForm?.addEventListener('submit', event => {
    event.preventDefault();
    addPerson(personNameInput.value);
  });

  personListEl?.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-person]');
    if (!button) return;
    removePerson(button.dataset.removePerson || '');
  });

  expenseForm?.addEventListener('submit', event => {
    event.preventDefault();
    addExpense(expenseForm);
  });

  expenseResetBtn?.addEventListener('click', () => {
    expenseForm?.reset();
    setFeedback(expenseFeedbackEl, '', 'info');
  });

  expenseListEl?.addEventListener('click', event => {
    const removeBtn = event.target.closest('[data-remove-expense]');
    if (removeBtn) {
      removeExpense(removeBtn.dataset.removeExpense || '');
      return;
    }
    const toggle = event.target.closest('.tag-toggle');
    if (toggle) {
      toggleExpenseParticipant(toggle.dataset.expenseId || '', toggle.dataset.personId || '');
    }
  });

  receiptInput?.addEventListener('change', event => {
    const input = event.target;
    if (!input || !input.files) return;
    receiptFile = input.files[0] || null;
    if (receiptFile) {
      setFeedback(experimentalStatusEl, `${receiptFile.name} ausgewählt.`, 'info');
    } else {
      setFeedback(experimentalStatusEl, '', 'info');
    }
    updateAnalyzeButtonState();
    updateExperimentalDefaultMessage();
  });

  analyzeReceiptBtn?.addEventListener('click', () => {
    if (!isAnalyzing) {
      handleAnalyzeReceipt();
    }
  });

  renderPersons();
  renderParticipantSelector();
  renderExpenses();
  renderSummary();
  updateAnalyzeButtonState();
  updateExperimentalDefaultMessage();
})();
