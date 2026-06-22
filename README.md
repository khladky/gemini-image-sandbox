# Flickr Gemini Sandbox

A simple Chrome extension for experimenting with Google Gemini queries against Flickr photos. Open any Flickr photo page, type a query, and see exactly what Gemini returns — unfiltered and unformatted.

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

1. Open any Flickr photo page
2. Click the extension icon in the toolbar
3. Type your query in the top box
4. Click **Ask Gemini**
5. The raw Gemini response appears in the box below

The photo and the last query you typed are remembered between popup opens. The response is also cached per photo, so reopening the popup on the same photo restores the last result.

## Notes

- Only works on public photos — private photos cannot be fetched by the extension
- The response is shown exactly as Gemini returns it, with no formatting or filtering applied
- The extension stores its API key separately from the Flickr AI Tagger, so you will need to save it again the first time

## License

MIT
