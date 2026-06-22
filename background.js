chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "QUERY") return false;
  handleQuery(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
  return true;
});

async function handleQuery({ base64, query, apiKey }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: base64 } },
            { text: query }
          ]
        }],
        generationConfig: { maxOutputTokens: 1000 }
      })
    }
  );

  if (res.status === 401 || res.status === 403) throw new Error("Invalid API key — check your key");
  if (res.status === 429) throw new Error("Rate limit reached — try again in a moment");
  if (!res.ok) throw new Error(`Gemini error (${res.status}) — try again`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    // Log the actual response for debugging
    console.log("Unexpected Gemini response:", JSON.stringify(data).slice(0, 500));
    const reason = data.candidates?.[0]?.finishReason;
    if (reason === "SAFETY") throw new Error("Blocked by Gemini safety filters");
    if (reason) throw new Error(`Gemini returned no text (reason: ${reason})`);
    throw new Error("Gemini returned no response");
  }
  return { text };
}
