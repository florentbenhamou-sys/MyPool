#!/usr/bin/env python3
"""Exhaustive, faithful dump of a .pptx slide: geometry, fills, lines, effects, text styles.

Reads the OOXML directly (lxml) so that nothing python-pptx abstracts away is lost:
scheme colours with lumMod/lumOff/shade, group transforms, connectors, tables, pictures, crops.

Usage: python dump_slide.py deck.pptx [slide_number=1] > raw_dump.json
"""
import colorsys
import json
import sys
import zipfile

from lxml import etree

EMU_PER_INCH = 914400
NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
PRESET_COLORS = {"black": "000000", "white": "FFFFFF", "red": "FF0000", "green": "00FF00", "blue": "0000FF"}
# Default clrMap of the Office master (bg1->lt1, tx1->dk1, bg2->lt2, tx2->dk2). Overridden from the master.
CLR_MAP = {"bg1": "lt1", "tx1": "dk1", "bg2": "lt2", "tx2": "dk2"}


def inch(v):
    return round(int(v) / EMU_PER_INCH, 3) if v is not None else None


def q(tag):
    pfx, local = tag.split(":")
    return "{%s}%s" % (NS[pfx], local)


def load(zf, path):
    return etree.fromstring(zf.read(path))


def theme_colors(theme):
    out = {}
    scheme = theme.find(".//a:clrScheme", NS)
    for child in scheme:
        name = etree.QName(child).localname
        c = child[0]
        out[name] = c.get("lastClr") if etree.QName(c).localname == "sysClr" else c.get("val")
    return out


def apply_mods(hex_rgb, el):
    """Apply lumMod/lumOff/shade/tint/alpha modifiers the way PowerPoint does (HSL luminance)."""
    r, g, b = (int(hex_rgb[i:i + 2], 16) / 255 for i in (0, 2, 4))
    alpha = 1.0
    mods = []
    for m in el:
        name = etree.QName(m).localname
        val = int(m.get("val")) / 100000
        mods.append({name: val})
        if name in ("lumMod", "lumOff"):
            h, l, s = colorsys.rgb_to_hls(r, g, b)
            l = l * val if name == "lumMod" else min(1.0, l + val)
            r, g, b = colorsys.hls_to_rgb(h, l, s)
        elif name == "shade":
            r, g, b = r * val, g * val, b * val
        elif name == "tint":
            r, g, b = (1 - (1 - c) * val for c in (r, g, b))
        elif name == "alpha":
            alpha = val
    return "%02X%02X%02X" % tuple(round(c * 255) for c in (r, g, b)), alpha, mods


def color(el, theme):
    """Resolve a colour choice element (srgbClr, schemeClr, prstClr, sysClr) to hex + provenance."""
    if el is None:
        return None
    kind = etree.QName(el).localname
    if kind == "srgbClr":
        base, ref = el.get("val"), None
    elif kind == "schemeClr":
        ref = el.get("val")
        base = theme.get(CLR_MAP.get(ref, ref))
    elif kind == "prstClr":
        ref, base = "preset:" + el.get("val"), PRESET_COLORS.get(el.get("val"), "000000")
    elif kind == "sysClr":
        ref, base = "sys:" + el.get("val"), el.get("lastClr")
    else:
        return {"unsupported": kind}
    hex_rgb, alpha, mods = apply_mods(base, el)
    out = {"hex": "#" + hex_rgb}
    if ref:
        out["theme_ref"] = ref
    if mods:
        out["modifiers"] = mods
    if alpha != 1.0:
        out["alpha"] = alpha
    return out


def first_color_child(el):
    if el is None:
        return None
    for c in el:
        if etree.QName(c).localname in ("srgbClr", "schemeClr", "prstClr", "sysClr"):
            return c
    return None


def fill(sppr, theme):
    if sppr is None:
        return None
    if sppr.find("a:noFill", NS) is not None:
        return {"type": "none"}
    sf = sppr.find("a:solidFill", NS)
    if sf is not None:
        return {"type": "solid", "color": color(first_color_child(sf), theme)}
    gf = sppr.find("a:gradFill", NS)
    if gf is not None:
        return {"type": "gradient", "stops": [
            {"pos": int(gs.get("pos")) / 1000, "color": color(first_color_child(gs), theme)}
            for gs in gf.findall(".//a:gs", NS)]}
    bf = sppr.find("a:blipFill", NS)
    if bf is not None:
        return {"type": "picture"}
    return None  # inherited from style / layout


def line(sppr, theme):
    ln = sppr.find("a:ln", NS) if sppr is not None else None
    if ln is None:
        return None
    out = {}
    if ln.get("w"):
        out["width_pt"] = round(int(ln.get("w")) / 12700, 2)
    if ln.find("a:noFill", NS) is not None:
        out["type"] = "none"
    sf = ln.find("a:solidFill", NS)
    if sf is not None:
        out["type"] = "solid"
        out["color"] = color(first_color_child(sf), theme)
    dash = ln.find("a:prstDash", NS)
    if dash is not None:
        out["dash"] = dash.get("val")
    for end in ("headEnd", "tailEnd"):
        e = ln.find("a:" + end, NS)
        if e is not None and e.get("type") not in (None, "none"):
            out[end] = {"type": e.get("type"), "w": e.get("w"), "len": e.get("len")}
    return out or None


def effects(sppr, theme):
    if sppr is None:
        return None
    out = []
    for sh in sppr.findall("a:effectLst/*", NS):
        name = etree.QName(sh).localname
        e = {"type": name}
        for k in ("blurRad", "dist"):
            if sh.get(k):
                e[k + "_pt"] = round(int(sh.get(k)) / 12700, 2)
        if sh.get("dir"):
            e["dir_deg"] = int(sh.get("dir")) / 60000
        e["color"] = color(first_color_child(sh), theme)
        out.append(e)
    return out or None


def style_refs(sp, theme):
    st = sp.find("p:style", NS)
    if st is None:
        return None
    out = {}
    for ref in ("lnRef", "fillRef", "effectRef", "fontRef"):
        r = st.find("a:" + ref, NS)
        if r is not None:
            out[ref] = {"idx": r.get("idx"), "color": color(first_color_child(r), theme)}
    return out


def run_props(rpr, theme):
    if rpr is None:
        return {}
    out = {}
    if rpr.get("sz"):
        out["size_pt"] = int(rpr.get("sz")) / 100
    for k, n in (("b", "bold"), ("i", "italic")):
        if rpr.get(k) is not None:
            out[n] = rpr.get(k) == "1"
    if rpr.get("cap") not in (None, "none"):
        out["caps"] = rpr.get("cap")
    if rpr.get("spc") not in (None, "0"):
        out["char_spacing_pt"] = int(rpr.get("spc")) / 100
    latin = rpr.find("a:latin", NS)
    if latin is not None:
        out["font"] = latin.get("typeface")
    c = first_color_child(rpr.find("a:solidFill", NS))
    if c is not None:
        out["color"] = color(c, theme)
    return out


def spacing(el):
    if el is None:
        return None
    pct, pts = el.find("a:spcPct", NS), el.find("a:spcPts", NS)
    if pct is not None:
        return {"pct": int(pct.get("val")) / 1000}
    if pts is not None:
        return {"pt": int(pts.get("val")) / 100}
    return None


def text_body(txbody, theme):
    if txbody is None:
        return None
    bp = txbody.find("a:bodyPr", NS)
    body = {
        "anchor": bp.get("anchor", "t"),
        "wrap": bp.get("wrap", "square"),
        "insets_in": {k: inch(bp.get(k, d)) for k, d in
                      (("lIns", 91440), ("tIns", 45720), ("rIns", 91440), ("bIns", 45720))},
        "autofit": next((etree.QName(c).localname for c in bp
                         if etree.QName(c).localname in ("spAutoFit", "normAutofit", "noAutofit")), None),
    }
    if bp.get("numCol"):
        body["columns"] = int(bp.get("numCol"))
    paras = []
    for p in txbody.findall("a:p", NS):
        ppr = p.find("a:pPr", NS)
        para = {"text": "".join(t.text or "" for t in p.iter(q("a:t")))}
        if ppr is not None:
            para["align"] = ppr.get("algn")
            if ppr.get("marL"):
                para["marL_in"] = inch(ppr.get("marL"))
            if ppr.get("indent"):
                para["indent_in"] = inch(ppr.get("indent"))
            if ppr.get("lvl"):
                para["level"] = int(ppr.get("lvl"))
            bu = ppr.find("a:buChar", NS)
            if bu is not None:
                para["bullet"] = {"char": bu.get("char"),
                                  "font": (ppr.find("a:buFont", NS).get("typeface")
                                           if ppr.find("a:buFont", NS) is not None else None)}
            elif ppr.find("a:buAutoNum", NS) is not None:
                para["bullet"] = {"autonum": ppr.find("a:buAutoNum", NS).get("type")}
            elif ppr.find("a:buNone", NS) is not None:
                para["bullet"] = None
            for k in ("lnSpc", "spcBef", "spcAft"):
                s = spacing(ppr.find("a:" + k, NS))
                if s:
                    para[k] = s
        runs = []
        for r in p.findall("a:r", NS):
            runs.append({"text": r.findtext("a:t", namespaces=NS), **run_props(r.find("a:rPr", NS), theme)})
        para["runs"] = runs
        end = p.find("a:endParaRPr", NS)
        if end is not None and not runs:
            para["end_props"] = run_props(end, theme)
        paras.append(para)
    body["paragraphs"] = paras
    lst = txbody.find("a:lstStyle", NS)
    if lst is not None and len(lst):
        body["has_list_style"] = True
    return body


def xfrm_of(el):
    x = el.find("p:spPr/a:xfrm", NS)
    if x is None:
        x = el.find("p:grpSpPr/a:xfrm", NS)
    if x is None:
        x = el.find("p:xfrm", NS)
    return x


def transform(x, parent):
    """Map child coords into slide space through the chain of group transforms."""
    off, ext = x.find("a:off", NS), x.find("a:ext", NS)
    ox, oy, cx, cy = (int(off.get("x")), int(off.get("y")), int(ext.get("cx")), int(ext.get("cy")))
    return parent(ox, oy, cx, cy)


def identity(x, y, w, h):
    return x, y, w, h


def walk(tree, theme, rels, parent=identity, group=None):
    out = []
    for el in tree:
        kind = etree.QName(el).localname
        if kind not in ("sp", "pic", "grpSp", "cxnSp", "graphicFrame"):
            continue
        nv = el.find(".//p:cNvPr", NS)
        x = xfrm_of(el)
        node = {"id": nv.get("id"), "name": nv.get("name"), "kind": kind}
        if nv.get("descr"):
            node["alt_text"] = nv.get("descr")
        if group:
            node["group"] = group
        if x is not None:
            X, Y, W, H = transform(x, parent)
            node["bbox_in"] = {"x": inch(X), "y": inch(Y), "w": inch(W), "h": inch(H),
                               "right": inch(X + W), "bottom": inch(Y + H)}
            node["bbox_emu"] = [X, Y, W, H]
            if x.get("rot"):
                node["rotation_deg"] = int(x.get("rot")) / 60000
            for f in ("flipH", "flipV"):
                if x.get(f) == "1":
                    node[f] = True
        sppr = el.find("p:spPr", NS)
        geom = sppr.find("a:prstGeom", NS) if sppr is not None else None
        if geom is not None:
            node["geometry"] = geom.get("prst")
            adj = {g.get("name"): g.get("fmla") for g in geom.findall("a:avLst/a:gd", NS)}
            if adj:
                node["geometry_adjust"] = adj
        elif sppr is not None and sppr.find("a:custGeom", NS) is not None:
            node["geometry"] = "custom"
        if el.find("p:nvSpPr/p:cNvSpPr", NS) is not None and el.find("p:nvSpPr/p:cNvSpPr", NS).get("txBox") == "1":
            node["is_textbox"] = True
        ph = el.find(".//p:nvPr/p:ph", NS)
        if ph is not None:
            node["placeholder"] = {"type": ph.get("type", "body"), "idx": ph.get("idx")}
        for k, fn in (("fill", fill), ("line", line), ("effects", effects)):
            v = fn(sppr, theme)
            if v:
                node[k] = v
        st = style_refs(el, theme)
        if st:
            node["style_refs"] = st
        tb = text_body(el.find("p:txBody", NS), theme)
        if tb and any(p["text"].strip() for p in tb["paragraphs"]):
            node["text"] = tb
        elif tb:
            node["text_empty"] = True
            ep = [p.get("end_props") for p in tb["paragraphs"] if p.get("end_props")]
            if ep:
                node["default_text_props"] = ep[0]
        if kind == "pic":
            blip = el.find(".//a:blip", NS)
            rid = blip.get(q("r:embed"))
            node["image"] = {"target": rels.get(rid)}
            src = el.find(".//a:srcRect", NS)
            if src is not None and src.attrib:
                node["image"]["crop_pct"] = {k: int(v) / 1000 for k, v in src.attrib.items()}
        if kind == "graphicFrame":
            tbl = el.find(".//a:tbl", NS)
            if tbl is not None:
                node["table"] = {
                    "col_widths_in": [inch(g.get("w")) for g in tbl.findall("a:tblGrid/a:gridCol", NS)],
                    "rows": [{"height_in": inch(tr.get("h")),
                              "cells": [text_body(tc.find("a:txBody", NS), theme) for tc in tr.findall("a:tc", NS)]}
                             for tr in tbl.findall("a:tr", NS)],
                }
        if kind == "grpSp":
            gx = el.find("p:grpSpPr/a:xfrm", NS)
            off, ext = gx.find("a:off", NS), gx.find("a:ext", NS)
            choff, chext = gx.find("a:chOff", NS), gx.find("a:chExt", NS)
            gox, goy, gcx, gcy = parent(int(off.get("x")), int(off.get("y")), int(ext.get("cx")), int(ext.get("cy")))
            cox, coy = int(choff.get("x")), int(choff.get("y"))
            ccx, ccy = int(chext.get("cx")) or 1, int(chext.get("cy")) or 1
            sx, sy = gcx / ccx, gcy / ccy

            def child(x0, y0, w0, h0, gox=gox, goy=goy, cox=cox, coy=coy, sx=sx, sy=sy):
                return (round(gox + (x0 - cox) * sx), round(goy + (y0 - coy) * sy), round(w0 * sx), round(h0 * sy))

            node["children"] = walk(el, theme, rels, child, nv.get("name"))
        out.append(node)
    return out


def main():
    path = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    zf = zipfile.ZipFile(path)
    pres = load(zf, "ppt/presentation.xml")
    sz = pres.find("p:sldSz", NS)
    theme = theme_colors(load(zf, "ppt/theme/theme1.xml"))
    master = load(zf, "ppt/slideMasters/slideMaster1.xml")
    cm = master.find("p:clrMap", NS)
    if cm is not None:
        CLR_MAP.update({k: v for k, v in cm.attrib.items()})
    slide_path = "ppt/slides/slide%d.xml" % n
    rels_xml = load(zf, "ppt/slides/_rels/slide%d.xml.rels" % n)
    rels = {r.get("Id"): r.get("Target") for r in rels_xml.findall("rel:Relationship", NS)}
    slide = load(zf, slide_path)
    bg = slide.find("p:cSld/p:bg", NS)
    th = load(zf, "ppt/theme/theme1.xml")
    result = {
        "file": path.split("/")[-1],
        "slide_number": n,
        "slide_size": {"w_in": inch(sz.get("cx")), "h_in": inch(sz.get("cy")),
                       "w_emu": int(sz.get("cx")), "h_emu": int(sz.get("cy"))},
        "layout": next((t for t in rels.values() if "slideLayout" in t), None),
        "theme": {"colors": {k: "#" + v for k, v in theme.items()},
                  "major_font": th.find(".//a:majorFont/a:latin", NS).get("typeface"),
                  "minor_font": th.find(".//a:minorFont/a:latin", NS).get("typeface"),
                  "clr_map": CLR_MAP},
        "background": "custom" if bg is not None else "inherited from layout/master",
        "shapes": walk(slide.find("p:cSld/p:spTree", NS), theme, rels),
    }
    json.dump(result, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
