#!/usr/bin/env python3
"""Draw bounding boxes, names, coordinates and the inferred grid axes on top of a slide render.

Usage: python annotate.py raw_dump.json template_definition.json slide.png out.png
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

ZONE_COLORS = {
    "HEADER": (220, 38, 38), "LEFT_COLUMN": (37, 99, 235), "CENTER_COLUMN": (22, 163, 74),
    "RIGHT_COLUMN": (147, 51, 234), "COACH_BAND": (234, 88, 12), "COACH_AREA": (8, 145, 178),
}


def font(size):
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                 "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def flatten(shapes):
    for s in shapes:
        yield s
        yield from flatten(s.get("children", []))


def main():
    raw = json.load(open(sys.argv[1]))
    tpl = json.load(open(sys.argv[2]))
    base = Image.open(sys.argv[3]).convert("RGB")
    W, H = base.size
    ppi = W / raw["slide_size"]["w_in"]
    # Pale copy of the slide so the overlay stays readable
    img = Image.blend(base, Image.new("RGB", base.size, "white"), 0.55)
    draw = ImageDraw.Draw(img, "RGBA")
    small, mid, big = font(13), font(15), font(20)

    def px(v):
        return round(v * ppi)

    # Alignment axes (dashed lines)
    for i, axis in enumerate(tpl["grid"]["alignment_axes"]):
        v = px(axis["value_in"])
        pts = [(v, 0), (v, H)] if axis["orientation"] == "vertical" else [(0, v), (W, v)]
        horizontal = axis["orientation"] == "horizontal"
        length = W if horizontal else H
        for start in range(0, length, 16):
            seg = [(start, v), (start + 8, v)] if horizontal else [(v, start), (v, start + 8)]
            draw.line(seg, fill=(236, 72, 153, 200), width=2)
        label = "%s = %.3f\"" % (axis["id"], axis["value_in"])
        draw.text((pts[0][0] + 3, H - 18 - 16 * (i % 4)) if not horizontal else (W - 260, v + 2), label,
                  fill=(190, 24, 93), font=small)

    # Zones (thick translucent outlines)
    for z in tpl["zones"]:
        b = z["bbox_in"]
        col = ZONE_COLORS.get(z["id"], (0, 0, 0))
        draw.rectangle([px(b["x"]), px(b["y"]), px(b["x"] + b["w"]), px(b["y"] + b["h"])],
                       outline=col + (230,), width=5, fill=col + (18,))
        draw.text((px(b["x"]) + 6, px(b["y"] + b["h"]) - 26), z["id"], fill=col + (255,), font=big)

    # Shapes (thin boxes with name + coordinates)
    for s in flatten(raw["shapes"]):
        if "bbox_in" not in s:
            continue
        b = s["bbox_in"]
        x0, y0, x1, y1 = px(b["x"]), px(b["y"]), px(b["right"]), px(b["bottom"])
        if y1 - y0 < 2:  # connectors have zero height
            y0, y1 = y0 - 3, y1 + 3
        draw.rectangle([x0, y0, x1, y1], outline=(15, 23, 42, 255), width=1)
        tag = "%s  (%.2f, %.2f) %.2f×%.2f" % (s["name"], b["x"], b["y"], b["w"], b["h"])
        if b["w"] < 1.3:  # small shapes: name only, coordinates are in raw_dump.json
            tag = s["name"]
        tw = draw.textlength(tag, font=small)
        ty = y0 + 1
        draw.rectangle([x0 + 1, ty, x0 + 5 + tw, ty + 16], fill=(255, 255, 255, 215))
        draw.text((x0 + 3, ty), tag, fill=(15, 23, 42), font=small)

    draw.text((W - 520, 4), "Slide %.3f\" × %.3f\" — render %d×%d px (%.1f px/in)" %
              (raw["slide_size"]["w_in"], raw["slide_size"]["h_in"], W, H, ppi), fill=(0, 0, 0), font=mid)
    img.save(sys.argv[4])


if __name__ == "__main__":
    main()
