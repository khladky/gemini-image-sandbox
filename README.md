# Flickr Gemini Sandbox

A Chrome extension for experimenting with Google Gemini queries against photos. Open any Flickr photo page, drop in an image, or open an image in a new tab — type a query and see exactly what Gemini returns, unfiltered and unformatted.

Useful for testing prompts before using them in the [Flickr AI Tagger](https://github.com/khladky/flickr-ai-tagger).

## Installing

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the folder

## Getting an API key

1. Go to [aistudio.google.com](https://aistudio.google.com) and sign in with a Google account
2. Click **Get API key** and create a new key
3. Paste it into the extension popup and click **Save**

The free tier allows a small number of requests per day. For heavier use, add billing — costs are a fraction of a penny per query.

## Usage

Open the extension popup from any tab. The popup detects what is currently open and behaves accordingly:

- **On a Flickr photo page** — the photo loads automatically. Works on your own private photos as long as you are logged into Flickr in Chrome. Private photos belonging to other people cannot be fetched.
- **On a tab containing just an image** (e.g. opened via "Open image in new tab") — the image loads automatically.
- **On any other page** — a drop zone appears. You can drop any image file onto it, or copy an image to the clipboard and click **Paste image from clipboard**. To copy an image to the clipboard: use Win+Shift+S (Snipping Tool), or open the image in a new browser tab and copy it from there.

Once an image is loaded, type your query in the top box and click **Ask Gemini**. The raw response appears in the box below. A **Copy response** button appears once the response arrives.

The last query you typed is remembered between sessions. The response is also cached per photo URL, so reopening the popup on the same Flickr photo restores the last result.

## Choosing a model

A dropdown lets you switch Gemini models without touching any code. Based on testing:

- **gemini-3.1-flash-lite** — recommended. Fast, reliable, good quality, no capacity issues.
- **gemini-3.5-flash** — more capable but slower and prone to truncating responses on photo description tasks.
- **gemini-3.1-pro-preview** — most capable, slower, higher cost. Worth trying for demanding queries.
- **gemini-2.5-flash** / **gemini-2.5-flash-lite** — older generation, still available but no longer recommended.

Your model choice is remembered between sessions.

## Example queries

An `example.txt` file is included with a range of ready-to-try queries — basic description, title and description, sarcastic tour guide, photo critique, poetic, five-year-old, location identification, tag suggestions, and more. Copy any line from that file into the query box to try it.

## Notes

- The response is shown exactly as Gemini returns it, with no formatting or filtering applied
- The extension stores its API key separately from the Flickr AI Tagger, so you will need to save it again the first time

## License

MIT
