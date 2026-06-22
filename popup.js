const $ = id => document.getElementById(id);

let lastResponseText = "";

function showResponse(text) {
  lastResponseText = text;
  $("response").textContent = text || "";
  $("response").style.color = text ? "#1a1a1a" : "#aaa";
  if (!text) $("response").textContent = "Response will appear here\u2026";
}

let photoUrl = null;

function setStatus(msg, cls = "") {
  $("status").textContent = msg;
  $("status").className = cls;
}

async function resizeToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 800;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

chrome.storage.local.get("geminiApiKey", ({ geminiApiKey }) => {
  if (geminiApiKey) $("api-key").value = geminiApiKey;
});

$("save-key-btn").addEventListener("click", () => {
  const key = $("api-key").value.trim();
  if (!key) return;
  chrome.storage.local.set({ geminiApiKey: key });
  setStatus("API key saved.");
  setTimeout(() => setStatus(""), 2000);
});

chrome.storage.local.get("lastQuery", ({ lastQuery }) => {
  if (lastQuery) $("query").value = lastQuery;
});

async function loadPhoto() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes("flickr.com/photos/")) {
    setStatus("Open a Flickr photo page first.", "error");
    return;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch {}
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_PHOTO_URL" });
    if (res?.error) { setStatus(res.error, "error"); return; }
    photoUrl = res.url;
    $("photo").src = photoUrl;
    $("photo").style.display = "block";
    $("ask-btn").disabled = false;
    setStatus("");
    const cached = await chrome.storage.local.get("sandbox:" + photoUrl);
    const cachedText = cached["sandbox:" + photoUrl];
    if (cachedText) {
      showResponse(cachedText);
      $("copy-btn").style.display = "block";
    }
  } catch {
    setStatus("Could not connect to page \u2014 try refreshing.", "error");
  }
}

document.addEventListener("DOMContentLoaded", loadPhoto);

$("ask-btn").addEventListener("click", async () => {
  const query = $("query").value.trim();
  if (!query) { setStatus("Enter a query first.", "warning"); return; }
  const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
  if (!geminiApiKey) { setStatus("Save your API key first.", "warning"); return; }
  chrome.storage.local.set({ lastQuery: query });
  $("ask-btn").disabled = true;
  $("ask-btn").textContent = "Asking Gemini\u2026";
  showResponse("");
  $("copy-btn").style.display = "none";
  setStatus("\u23f3 Preparing image\u2026");
  try {
    const base64 = await resizeToBase64(photoUrl);
    setStatus("\u26a1 Waiting for Gemini\u2026");
    const result = await chrome.runtime.sendMessage({
      type: "QUERY", base64, query, apiKey: geminiApiKey
    });
    if (result?.error) {
      setStatus(result.error, "error");
    } else {
      showResponse(result.text);
      $("copy-btn").style.display = "block";
      setStatus("");
      chrome.storage.local.set({ ["sandbox:" + photoUrl]: result.text });
    }
  } catch (e) {
    setStatus("Error: " + e.message, "error");
  }
  $("ask-btn").disabled = false;
  $("ask-btn").textContent = "Ask Gemini";
});

$("copy-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(lastResponseText);
    $("copy-btn").textContent = "\u2713 Copied";
    setTimeout(() => { $("copy-btn").textContent = "\ud83d\udccb Copy response"; }, 1500);
  } catch {}
});
