from html import escape
from html.parser import HTMLParser

from app.services.html_safety import MEDIA_URL


class ArticleHtml(HTMLParser):
    """Decorate already sanitized HTML, never parse trusted author HTML directly."""

    def __init__(self, media, prefix="section"):
        super().__init__(convert_charrefs=True)
        self.images = {str(m["id"]): m for m in media}
        self.output = []
        self.toc = []
        self.heading = None
        self.prefix = prefix

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag in ("h2", "h3", "h4"):
            self.heading = {
                "id": f"{self.prefix}-{len(self.toc) + 1}",
                "text": "",
                "level": int(tag[1]),
            }
            self.toc.append(self.heading)
            values["id"] = self.heading["id"]
        if tag == "img":
            match = MEDIA_URL.fullmatch(values.get("src", ""))
            if match and (image := self.images.get(match.group(1))):
                values.update(
                    width=str(image["width"]),
                    height=str(image["height"]),
                    alt=image["alt_text"],
                    loading="lazy",
                    decoding="async",
                )
        self.output.append(
            "<"
            + tag
            + "".join(
                f' {escape(k, quote=True)}="{escape(v or "", quote=True)}"'
                for k, v in values.items()
            )
            + ">"
        )

    def handle_endtag(self, tag):
        if tag in ("h2", "h3", "h4"):
            self.heading = None
        self.output.append(f"</{tag}>")

    def handle_data(self, data):
        self.output.append(escape(data))
        if self.heading is not None:
            self.heading["text"] += data


def decorate(html, media, prefix="section"):
    parser = ArticleHtml(media, prefix)
    parser.feed(html)
    parser.close()
    return "".join(parser.output), parser.toc
