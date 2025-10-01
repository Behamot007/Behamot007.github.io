(() => {
  const API_BASE = "/api/openai";

  async function parseJsonResponse(response) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async function chat({
    systemPrompt,
    userPrompt,
    messages,
    model,
    temperature,
    maxTokens
  } = {}) {
    const payload = {};

    if (Array.isArray(messages) && messages.length > 0) {
      payload.messages = messages;
    } else {
      if (typeof systemPrompt === "string") payload.systemPrompt = systemPrompt;
      if (typeof userPrompt === "string") payload.userPrompt = userPrompt;
    }

    if (typeof model === "string" && model.trim()) {
      payload.model = model.trim();
    }
    if (Number.isFinite(temperature)) {
      payload.temperature = temperature;
    }
    if (Number.isFinite(maxTokens)) {
      payload.maxTokens = maxTokens;
    }

    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await parseJsonResponse(response);
    if (!response.ok) {
      const message = data?.error || data?.message || "OpenAI-Anfrage fehlgeschlagen";
      const error = new Error(message);
      error.status = response.status;
      error.details = data;
      throw error;
    }

    return data;
  }

  async function getStatus() {
    const response = await fetch(`${API_BASE}/status`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    const data = await parseJsonResponse(response);
    if (!response.ok) {
      const message = data?.error || data?.message || "OpenAI-Status konnte nicht geladen werden";
      const error = new Error(message);
      error.status = response.status;
      error.details = data;
      throw error;
    }

    return data ?? {};
  }

  window.openAiClient = {
    chat,
    getStatus
  };
})();
