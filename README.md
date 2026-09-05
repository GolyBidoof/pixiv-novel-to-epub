# Pixiv Novel → EPUB (Tampermonkey)

A userscript that converts [pixiv](https://www.pixiv.net) novel pages into
downloadable EPUB files — with vertical right-to-left Japanese typography,
series support, cover art, and the author's summary and credit.

Works on **Tampermonkey** (Chromium/Firefox/Safari) and Violentmonkey.


|<img width="374" height="630" alt="image" src="https://github.com/user-attachments/assets/a13bb31b-3ac5-4fba-baab-ec6ebac83298" /> |<img width="1021" height="804" alt="image" src="https://github.com/user-attachments/assets/63edebe0-af9b-480c-b991-99a94a0baef7" /> | <img width="818" height="854" alt="image" src="https://github.com/user-attachments/assets/ae37cd87-ec05-40a8-ad02-f05712e2897d" /> |
| - | - | - |

---

## Features

- **One-click EPUB export** from any `https://www.pixiv.net/novel/show.php?id=…` page.
- **Vertical, top-to-bottom reading order** — Chinese/Japanese EPUB3 `writing-mode: vertical-rl`,
  right-to-left spine, and a vertical 目次 (table of contents).
- **Full chapter extraction** — pulls the complete body text from pixiv's
  internal API, preserving paragraph structure and cleaning inline markers
  (`[newpage]`, `[chapter:…]`, `[uploadimage:N]`, `[b:…]`).
- **Series (multi-chapter) support**:
  - Walks the whole series from any chapter (back to #1, then forward to the end),
    even when intermediate chapters are flagged unavailable.
  - Unavailable chapters are *kept in the book* as a numbered placeholder
    (「未収録」 in the TOC) so you always know what's missing.
  - Two output modes: **one merged book** for the whole series, or
    **one EPUB per chapter**.
- **Cover art** — the pixiv novel cover is embedded as the book's first page
  and set as the EPUB cover image.
- **Front matter page** — title, author name (hyperlinked to their pixiv
  profile), author avatar, the あらすじ (summary), and a link back to the
  original work on pixiv.
- **Hyperlinks throughout** — every chapter page and TOC entry links back to
  its pixiv page.
- **Right-to-left, top-to-bottom TOC** with real chapter titles.
- **Progress-aware UI** — a top-right panel that preloads series info while you
  browse, updates live as chapters are fetched, and follows pixiv's
  client-side (History API) navigation.

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey).
2. Open the **raw** file in your browser:
   [`pixiv-novel-to-epub.user.js`](pixiv-novel-to-epub.user.js)
   (or copy its contents into a new userscript in the Tampermonkey dashboard).
3. Tampermonkey will ask to install — confirm.
4. Go to any pixiv novel page (you must be **logged in**; the script uses your
   session to fetch the novel text and images).

## Usage

1. Open any pixiv novel page, e.g. `https://www.pixiv.net/novel/show.php?id=12345678`.
2. Click **"Save as EPUB"** (top-right). A settings panel opens:
   - **Scope**: *Entire series* (from chapter 1) or *This chapter*.
   - **Output**: *One merged book* or *Separate EPUB per chapter*.
   - The chapter list shows every chapter in the series, with the current one
     highlighted and unavailable ones marked.
3. Click **⬇ Download**. The EPUB(s) are saved with a readable filename:
   `<title> (pixiv <id>).epub` or `<series title> (pixiv series <id>).epub`.

## Requirements / notes

- **Login required.** Pixiv serves novel content only to logged-in sessions.
- R-18 / restricted novels that your account cannot view will be marked
  「未収録」 (not included) in the book rather than failing the whole download.
- Works with Apple Books, [ッツ Ebook Reader (TTSu)](https://reader.ttsu.app)
  ([GitHub](https://github.com/ttu-ttu/ebook-reader)), Calibre, and other EPUB3
  readers. External pixiv links open in the reader's browser.

## Permissions

The script requests:

| Grant | Why |
|---|---|
| `GM_xmlhttpRequest` | Fetch novel JSON, cover, avatar, inline images from pixiv's API/CDNs |
| `GM_download` | Save the EPUB file (falls back to an `<a download>` link otherwise) |
| `GM_addStyle` | Inject the panel styling (falls back to a `<style>` tag) |

`@connect` entries permit requests to `www.pixiv.net`, `i.pximg.net`, and
`s.pximg.net` only.

## Legal

This script is for **personal archiving** of works you are entitled to view on
pixiv. Respect pixiv's [Terms of Use](https://policies.pixiv.net/en.html) and
the original authors' rights — do not redistribute downloaded works. The script
itself is MIT licensed.

## Credits

- **Author:** [GolyBidoof](https://github.com/GolyBidoof)
- **Co-developed with:** DeepSeek V4 Flash
- **Compatible readers:** [ッツ Ebook Reader (TTSu)](https://reader.ttsu.app) ·
  [source repository](https://github.com/ttu-ttu/ebook-reader) · [pixiv](https://www.pixiv.net)

## License

MIT — see [LICENSE](LICENSE).
