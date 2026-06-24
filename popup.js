const $ = id => document.getElementById(id);

let lastResponseText = "";
let droppedBase64 = null;
let photoUrl = null;

function setStatus(msg, cls = "") {
  $("status").textContent = msg;
  $("status").className = cls;
}

function showResponse(text) {
  lastResponseText = text;
  $("response").textContent = text || "";
  $("response").style.color = text ? "#1a1a1a" : "#aaa";
  if (!text) $("response").textContent = "Response will appear here\u2026";
}

async function resizeToBase64(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxSize = 800;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function fetchAndResizeUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return resizeToBase64(blob);
}

async function loadImageBlob(blob) {
  setStatus("Resizing image\u2026");
  try {
    droppedBase64 = await resizeToBase64(blob);
    const dataUrl = "data:image/jpeg;base64," + droppedBase64;
    $("photo").src = dataUrl;
    $("photo").style.display = "block";
    $("drop-zone").textContent = "Image loaded \u2014 drop or paste another to replace";
    $("ask-btn").disabled = false;
    setStatus("");
    showResponse("");
    $("copy-btn").style.display = "none";
    // Cache image, clear old response
    chrome.storage.local.set({ "sandbox:dropped": droppedBase64 });
    chrome.storage.local.remove("sandbox:dropped:response");
  } catch (err) {
    setStatus("Failed to load image: " + err.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {

  // API key and model
  chrome.storage.local.get(["geminiApiKey", "geminiModel"], ({ geminiApiKey, geminiModel }) => {
    if (geminiApiKey) $("api-key").value = geminiApiKey;
    if (geminiModel) $("model-select").value = geminiModel;
  });

  $("save-key-btn").addEventListener("click", () => {
    const key = $("api-key").value.trim();
    if (!key) return;
    chrome.storage.local.set({ geminiApiKey: key });
    setStatus("API key saved.");
    setTimeout(() => setStatus(""), 2000);
  });

  $("model-select").addEventListener("change", () => {
    chrome.storage.local.set({ geminiModel: $("model-select").value });
  });

  // Last query
  chrome.storage.local.get("lastQuery", ({ lastQuery }) => {
    if (lastQuery) $("query").value = lastQuery;
  });

  // Clear cache
  $("clear-cache-btn").addEventListener("click", async () => {
    const all = await chrome.storage.local.get(null);
    const toRemove = Object.keys(all).filter(k => k.startsWith("sandbox:"));
    await chrome.storage.local.remove(toRemove);
    droppedBase64 = null;
    $("photo").src = "";
    $("photo").style.display = "none";
    $("drop-zone").textContent = "Drop an image here, or copy one (Win+Shift+S or open in new tab) then click Paste";
    $("ask-btn").disabled = true;
    showResponse("");
    $("copy-btn").style.display = "none";
    setStatus("Cache cleared.", "success");
    setTimeout(() => setStatus(""), 2000);
  });

  // Drop zone
  const dropZone = $("drop-zone");
  dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("over"));
  dropZone.addEventListener("drop", async e => {
    e.preventDefault();
    dropZone.classList.remove("over");
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) { setStatus("Drop an image file.", "warning"); return; }
    await loadImageBlob(file);
  });

  // Paste button
  $("paste-btn").addEventListener("click", async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          await loadImageBlob(blob);
          return;
        }
      }
      setStatus("No image in clipboard \u2014 try copying an image first.", "warning");
    } catch (e) {
      setStatus("Could not read clipboard: " + e.message, "error");
    }
  });

  // Copy response
  $("copy-btn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastResponseText);
      $("copy-btn").textContent = "\u2713 Copied";
      setTimeout(() => { $("copy-btn").textContent = "\ud83d\udccb Copy response"; }, 1500);
    } catch {}
  });

  // Ask Gemini
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
      const base64 = droppedBase64 || await fetchAndResizeUrl(photoUrl);
      setStatus("\u26a1 Waiting for Gemini\u2026");
      const model = $("model-select").value;
      const result = await chrome.runtime.sendMessage({
        type: "QUERY", base64, query, apiKey: geminiApiKey, model
      });
      if (result?.error) {
        setStatus(result.error, "error");
      } else {
        showResponse(result.text);
        $("copy-btn").style.display = "block";
        setStatus("");
        if (photoUrl && !droppedBase64) {
          chrome.storage.local.set({ ["sandbox:" + photoUrl]: result.text });
        } else {
          chrome.storage.local.set({ "sandbox:dropped:response": result.text });
        }
      }
    } catch (e) {
      setStatus("Error: " + e.message, "error");
    }
    $("ask-btn").disabled = false;
    $("ask-btn").textContent = "Ask Gemini";
  });

  // Determine what to show based on current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab?.url?.includes("flickr.com/photos/")) {
    // Flickr photo page
    dropZone.style.display = "none";
    $("paste-btn").style.display = "none";
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
      const cached = await chrome.storage.local.get("sandbox:" + photoUrl);
      const cachedText = cached["sandbox:" + photoUrl];
      if (cachedText) { showResponse(cachedText); $("copy-btn").style.display = "block"; }
    } catch {
      setStatus("Could not load photo \u2014 try refreshing the page.", "error");
    }

  } else if (tab?.url && /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i.test(tab.url)) {
    // Bare image tab
    dropZone.style.display = "none";
    $("paste-btn").style.display = "none";
    photoUrl = tab.url;
    $("photo").src = photoUrl;
    $("photo").style.display = "block";
    $("ask-btn").disabled = false;
    const cached = await chrome.storage.local.get("sandbox:" + photoUrl);
    const cachedText = cached["sandbox:" + photoUrl];
    if (cachedText) { showResponse(cachedText); $("copy-btn").style.display = "block"; }

  } else {
    // Other page — show drop/paste zone, check for cached dropped image
    dropZone.style.display = "block";
    $("paste-btn").style.display = "block";
    const cached = await chrome.storage.local.get(["sandbox:dropped", "sandbox:dropped:response"]);
    if (cached["sandbox:dropped"]) {
      droppedBase64 = cached["sandbox:dropped"];
      $("photo").src = "data:image/jpeg;base64," + droppedBase64;
      $("photo").style.display = "block";
      dropZone.textContent = "Previous image restored \u2014 drop or paste another to replace";
      $("ask-btn").disabled = false;
      if (cached["sandbox:dropped:response"]) {
        showResponse(cached["sandbox:dropped:response"]);
        $("copy-btn").style.display = "block";
      }
      setStatus("");
    } else {
      $("photo").style.display = "none";
      $("ask-btn").disabled = true;
      setStatus("Not on a Flickr photo page \u2014 drop or paste an image above to use instead.", "warning");
    }
  }

});
