"""Library-independent, bounded visual document contract; never accept executable HTML/CSS."""

import re
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.schemas.common import StrictSchema
from app.services.aparat import video_id
from app.services.html_safety import clean_html, safe_link

WidgetType = Literal[
    "Container",
    "Grid",
    "Heading",
    "RichText",
    "Image",
    "Video",
    "Button",
    "Icon",
    "Gallery",
    "Carousel",
    "Tabs",
    "Accordion",
    "FAQ",
    "Features",
    "Statistics",
    "Testimonials",
    "CTA",
    "ContactForm",
    "DemoForm",
    "Pricing",
    "ProductShowcase",
    "ArticleList",
    "LegacySection",
    "Hero",
    "FeatureStory",
]


def validate_color(value: str | None):
    if value is not None and not re.fullmatch(
        r"(?:#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?|transparent|global:[a-z][a-z0-9_-]{0,31})", value
    ):
        raise ValueError("Use a hex color or a registered global token")
    return value


def dimension(value: str | None):
    if (
        value is not None
        and value != "auto"
        and not re.fullmatch(r"(?:[0-9]{1,4}(?:\.[0-9]{1,2})?)(?:px|rem|%|vw|vh)", value)
    ):
        raise ValueError("Use a bounded numeric CSS dimension")
    if value not in (None, "auto") and float(re.match(r"[0-9.]+", value)[0]) > 2000:
        raise ValueError("Dimension is too large")
    return value


class StyleValues(StrictSchema):
    display: Literal["block", "flex", "grid"] | None = None
    direction: Literal["row", "column", "row-reverse", "column-reverse"] | None = None
    wrap: bool | None = None
    columns: int | None = Field(default=None, ge=1, le=12)
    gap: int | None = Field(default=None, ge=0, le=128)
    padding: int | None = Field(default=None, ge=0, le=160)
    padding_inline: int | None = Field(default=None, ge=0, le=160)
    padding_block: int | None = Field(default=None, ge=0, le=160)
    margin: int | None = Field(default=None, ge=-160, le=160)
    margin_inline: int | None = Field(default=None, ge=-160, le=160)
    margin_block: int | None = Field(default=None, ge=-160, le=160)
    width: str | None = None
    max_width: str | None = None
    height: str | None = None
    min_height: int | None = Field(default=None, ge=0, le=1600)
    position: Literal["static", "relative", "absolute", "sticky", "fixed"] | None = None
    top: int | None = Field(default=None, ge=-2000, le=2000)
    inset_start: int | None = Field(default=None, ge=-2000, le=2000)
    align: Literal["start", "center", "end", "stretch"] | None = None
    justify: Literal["start", "center", "end", "space-between", "space-around"] | None = None
    text_align: Literal["start", "center", "end", "justify"] | None = None
    color: str | None = None
    background: str | None = None
    gradient_from: str | None = None
    gradient_to: str | None = None
    gradient_angle: int | None = Field(default=None, ge=0, le=360)
    border_color: str | None = None
    border_width: int | None = Field(default=None, ge=0, le=12)
    border_style: Literal["solid", "dashed", "dotted", "none"] | None = None
    radius: int | None = Field(default=None, ge=0, le=96)
    shadow: Literal["none", "soft", "raised"] | None = None
    font_family: Literal["sans", "serif", "mono"] | None = None
    font_size: int | None = Field(default=None, ge=10, le=120)
    font_weight: Literal[300, 400, 500, 600, 700, 800, 900] | None = None
    line_height: float | None = Field(default=None, ge=1, le=3)
    letter_spacing: float | None = Field(default=None, ge=-2, le=10)
    transition_ms: int | None = Field(default=None, ge=0, le=600)
    hidden: bool | None = None

    _colors = field_validator(
        "color", "background", "border_color", "gradient_from", "gradient_to"
    )(validate_color)
    _dimensions = field_validator("width", "max_width", "height")(dimension)


class NodeStyles(StrictSchema):
    base: StyleValues = Field(default_factory=StyleValues)
    tablet: StyleValues = Field(default_factory=StyleValues)
    mobile: StyleValues = Field(default_factory=StyleValues)
    hover: StyleValues = Field(default_factory=StyleValues)
    focus: StyleValues = Field(default_factory=StyleValues)


class WidgetItem(StrictSchema):
    title: str = Field(default="", max_length=180)
    text: str = Field(default="", max_length=4000)
    body_html: str = Field(default="", max_length=16000)
    href: str | None = Field(default=None, max_length=500)
    media_id: UUID | None = None
    value: str = Field(default="", max_length=80)
    attribution: str = Field(default="", max_length=180)

    _html = field_validator("body_html")(clean_html)

    @field_validator("href")
    @classmethod
    def link(cls, value):
        return safe_link(value) if value else value


class WidgetProps(StrictSchema):
    title: str = Field(default="", max_length=180)
    text: str = Field(default="", max_length=4000)
    accent: str = Field(default="", max_length=180)
    kicker: str = Field(default="", max_length=180)
    body_html: str = Field(default="", max_length=64000)
    level: int = Field(default=2, ge=1, le=6)
    href: str = Field(default="/demo", max_length=500)
    label: str = Field(default="", max_length=180)
    media_id: UUID | None = None
    aparat_id: str = Field(default="", max_length=200)
    icon: Literal["school", "message", "users", "book", "check", "shield", "arrow", "star"] = (
        "school"
    )
    items: list[WidgetItem] = Field(default_factory=list, max_length=24)
    faq_slugs: list[str] = Field(default_factory=list, max_length=24)
    feature_slug: str = Field(default="messenger", max_length=160, pattern=r"^[\w-]+$")
    category: str = Field(default="", max_length=160, pattern=r"^[\w-]*$")
    limit: int = Field(default=3, ge=1, le=12)
    legacy_section: dict | None = None

    _html = field_validator("body_html")(clean_html)
    _link = field_validator("href")(safe_link)

    @field_validator("aparat_id")
    @classmethod
    def aparat(cls, value):
        return video_id(value) if value else value

    @field_validator("faq_slugs")
    @classmethod
    def slugs(cls, values):
        if any(not re.fullmatch(r"[\w]+(?:-[\w]+)*", item) or len(item) > 160 for item in values):
            raise ValueError("Invalid FAQ reference")
        return values

    @field_validator("legacy_section")
    @classmethod
    def legacy(cls, value):
        if value is not None:
            from app.schemas.cms import Section

            return Section.model_validate(value).model_dump(mode="json")
        return value


class VisualNode(StrictSchema):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    type: WidgetType
    version: Literal[1] = 1
    props: WidgetProps = Field(default_factory=WidgetProps)
    styles: NodeStyles = Field(default_factory=NodeStyles)
    children: list["VisualNode"] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def children_and_content(self):
        if self.children and self.type not in ("Container", "Grid"):
            raise ValueError("Only layout widgets can contain child nodes")
        if self.type == "LegacySection" and self.props.legacy_section is None:
            raise ValueError("Legacy section data is required")
        if self.type == "Video" and not self.props.aparat_id:
            raise ValueError("A validated Aparat identifier is required")
        return self


class DocumentGlobals(StrictSchema):
    colors: dict[str, str] = Field(
        default_factory=lambda: {
            "brand": "#156fee",
            "primary": "#1266df",
            "text": "#172a4b",
            "surface": "#ffffff",
        },
        max_length=32,
    )
    font: Literal["sans", "serif", "mono"] = "sans"

    @field_validator("colors")
    @classmethod
    def tokens(cls, value):
        for name, item in value.items():
            if not re.fullmatch(r"[a-z][a-z0-9_-]{0,31}", name) or not re.fullmatch(
                r"#[0-9a-fA-F]{6}", item
            ):
                raise ValueError("Global colors require safe names and hex values")
        return value


class VisualDocument(StrictSchema):
    schema_version: Literal[2] = 2
    globals: DocumentGlobals = Field(default_factory=DocumentGlobals)
    nodes: list[VisualNode] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def bounded_tree(self):
        seen = set()

        def visit(nodes, depth):
            if depth > 10:
                raise ValueError("Maximum nesting depth is 10")
            for node in nodes:
                if node.id in seen:
                    raise ValueError("Node identifiers must be unique")
                seen.add(node.id)
                if len(seen) > 300:
                    raise ValueError("Maximum node count is 300")
                for styles in (
                    node.styles.base,
                    node.styles.tablet,
                    node.styles.mobile,
                    node.styles.hover,
                    node.styles.focus,
                ):
                    for name in (
                        "color",
                        "background",
                        "border_color",
                        "gradient_from",
                        "gradient_to",
                    ):
                        value = getattr(styles, name)
                        if (
                            value
                            and value.startswith("global:")
                            and value[7:] not in self.globals.colors
                        ):
                            raise ValueError("Unknown global color token")
                visit(node.children, depth + 1)

        visit(self.nodes, 1)
        return self

    def all_nodes(self):
        def visit(nodes):
            for node in nodes:
                yield node
                yield from visit(node.children)

        return list(visit(self.nodes))
