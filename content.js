chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "GET_PHOTO_URL") return false;

  const img = document.querySelector("div.photo-well-media-scrappy-view img.main-photo")
           || document.querySelector("img.main-photo")
           || document.querySelector("div.photo-div img");

  if (!img || !img.src) {
    sendResponse({ error: "Could not find photo on this page." });
    return false;
  }

  sendResponse({ url: img.src });
  return false;
});
