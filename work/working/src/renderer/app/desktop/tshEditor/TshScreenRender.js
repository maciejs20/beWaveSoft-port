// Static drawing of one TSH keypad screen (PROJEKT-TSH-EDYTOR.md "Wierność podglądu"): the draw items of
// tshLayout.screenDrawList in keypad pixels, scaled by a CSS transform. Theme picture or flat color, the grid, the
// status bar, page dots, the screensaver clock, and every widget with its WDGT icon or Roboto text in its size,
// alignment and colors. No event handlers: the canvas (TshCanvas.js) puts selection and pointer handling on top, and
// the screen thumbnails use it as it is.
// Props:
//   state           TshEditorState (tshEditorModel.js)
//   screen          screen record to draw (the canvas passes a copy with the dragged widget at its drag position)
//   themes          themes.json list ([] until loaded)
//   customImages    { "<image name>": url } of card backgrounds cut out in this session (optional)
//   scale           CSS pixels per keypad pixel
//   now             time of the clocks and Date/time widgets (optional: new Date() at each render)
//   lang            TSH input language of the date texts (optional: state.input.lang)
// Re-renders only when one of screen, scale, themes, customImages, now or lang changes: every model operation
// clones the whole state, so a changed theme record or screen list also gives the screen a new identity.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TshScreenRender = undefined;
var react = require("../../../lib/react/react.reexport.js");
var TshLayout = require("./tshLayout.js");
var tshAssets = require("./tshAssets.js");
var ICON_FONT = tshAssets.TSH_FONT.icons;
var TEXT_FONT = tshAssets.TSH_FONT.light;
var THIN_FONT = tshAssets.TSH_FONT.thin;
// "rrggbb" with an opacity as a CSS rgba(). Returns the string.
var rgba = function (hex, opacity) {
  var n = parseInt(hex, 16);
  return `rgba(${n >> 16 & 0xff}, ${n >> 8 & 0xff}, ${n & 0xff}, ${opacity})`;
};
// One WDGT glyph in its em box (the font has ascent 1000, descent 0: line-height 1 puts the em box on the box).
var Glyph = function (props) {
  return <span style={{
    position: "absolute",
    left: props.left ?? 0,
    top: props.top ?? 0,
    width: props.size,
    height: props.size,
    fontFamily: ICON_FONT,
    fontSize: props.size,
    lineHeight: 1,
    color: props.color,
    whiteSpace: "pre"
  }}>{String.fromCharCode(props.code)}</span>;
};
// CSS font family of a Roboto face of the layout ("light" | "thin"). Returns the family.
var robotoFamily = function (face) {
  return face === "thin" ? THIN_FONT : TEXT_FONT;
};
// Style of a text drawn like GDI TextOut at a box top: a block with Chrome's own line box (hhea ascent + descent),
// moved so that its baseline falls on GDI's (TextHeight ascent below the top). Returns the style object; callers add
// left and add their top to marginTop's base.
var textStyle = function (font, face, color) {
  return {
    position: "absolute",
    display: "block",
    marginTop: TshLayout.textAscent(font) - font * TshLayout.ROBOTO_HHEA_ASCENT / 2048,
    fontFamily: robotoFamily(face),
    fontSize: font,
    lineHeight: font * TshLayout.ROBOTO_HHEA_HEIGHT / 2048 + "px",
    color: color,
    whiteSpace: "pre"
  };
};
// Contents of a widget box by its layout kind. Returns the element.
var WidgetContent = function (props) {
  var l = props.layout;
  var colors = props.colors;
  switch (l.kind) {
    case "text":
      return <span style={Object.assign(textStyle(l.font, l.face, "#" + colors[0]), {
        left: l.textX,
        top: 0
      })}>{l.text}</span>;
    case "icon":
      return l.glyph === null ? null : <Glyph code={l.glyph} size={l.font} color={"#" + colors[0]} />;
    case "indicator":
      return <div>{l.layers.map(function (layer, i) {
          return <Glyph key={i} code={layer.glyph} size={l.font} color={layer.color} />;
        })}</div>;
    case "rect":
      // GDI Rectangle with a pen as wide as the border: the pen is centered on the box edge.
      return <div style={{
        position: "absolute",
        inset: 0,
        backgroundColor: rgba(colors[1], l.opacity)
      }}>{l.border > 0 && <div style={{
          position: "absolute",
          left: -l.border / 2,
          top: -l.border / 2,
          right: -l.border / 2,
          bottom: -l.border / 2,
          boxSizing: "border-box",
          border: `${l.border}px solid #${colors[0]}`
        }} />}</div>;
    default:
      return <div style={{
        position: "absolute",
        inset: 0,
        boxSizing: "border-box",
        border: "1px dashed #" + colors[0],
        backgroundImage: `repeating-linear-gradient(45deg, ${rgba(colors[0], 0.55)} 0 2px, transparent 2px 8px)`
      }} />;
  }
};
// WDGT glyphs placed by the layout ({ code, left, top, size }) in one color. Returns the elements.
var Glyphs = function (props) {
  return props.items.map(function (g, i) {
    return <Glyph key={i} code={g.code} size={g.size} left={g.left} top={g.top} color={props.color} />;
  });
};
// Status bar of a user or additional screen (TSH FUN_00aa7fe4): the status icons where TSH draws them (TSH2 only),
// the screen name in the middle and the clock ending at 3 user icons from the right edge, both Roboto Light bold at
// barTop (GDI's synthesized bold adds a pixel per character), the user icon, and a line in cl1 one screen pixel wide
// on the pixel row of the bar height.
var StatusBar = function (props) {
  var m = props.m;
  var item = props.item;
  var text = Object.assign(textStyle(m.barFont, "light", item.color), {
    top: m.barTop,
    fontWeight: "700",
    letterSpacing: TshLayout.BOLD_EXTRA_ADVANCE * props.hair
  });
  return <div><Glyphs items={item.icons} color={item.color} /><span style={Object.assign({}, text, {
      left: 0,
      width: m.width,
      textAlign: "center"
    })}>{item.name}</span><span style={Object.assign({}, text, {
      right: 3 * m.barUser
    })}>{item.clock}</span><Glyph code={TshLayout.STATUS_ICONS.user} size={m.barUser} left={m.width - 2 * m.barUser} top={m.barUserY} color={item.color} /><div style={{
      position: "absolute",
      left: 0,
      top: m.bar + 0.5 - props.hair / 2,
      width: m.width,
      height: props.hair,
      backgroundColor: item.color
    }} /></div>;
};
// Screensaver (TSH FUN_00aa064c, FUN_00aa7fe4): the status icons in the middle of the top edge (TSH2 only) and the
// clock, hours and minutes in Roboto Thin around a Roboto Light colon at half size, seconds at fixed fractions of the
// screen (layout TshLayout.saverClock).
var Saver = function (props) {
  var item = props.item;
  return <div><Glyphs items={item.icons} color={item.color} />{item.clock && ["hours", "colon", "minutes", "seconds"].map(function (k) {
      var part = item.clock[k];
      return <span key={k} style={Object.assign(textStyle(part.font, part.face, item.color), {
        left: part.left,
        top: part.top
      })}>{part.text}</span>;
    })}</div>;
};
// Grid lines (screen byte 7 bit 0x10) as an SVG over the background, one screen pixel wide (props.hair) like the
// TSH preview. Returns the element.
var Grid = function (props) {
  var m = props.m;
  return <svg width={m.width} height={m.height} style={{
    position: "absolute",
    left: 0,
    top: 0,
    pointerEvents: "none"
  }}>{props.item.lines.map(function (l, i) {
      // GDI draws a 1 px pen line on the pixel column/row of its coordinate: the middle of keypad pixel x is x + 0.5.
      var vertical = l.x1 === l.x2;
      return <line key={i} x1={l.x1 + (vertical ? 0.5 : 0)} y1={l.y1 + (vertical ? 0 : 0.5)} x2={l.x2 + (vertical ? 0.5 : 0)} y2={l.y2 + (vertical ? 0 : 0.5)} stroke={props.item.color} strokeWidth={props.hair} />;
    })}</svg>;
};
// One widget box with its contents at its layout position. Returns the element.
var Widget = function (props) {
  var l = props.item.layout;
  return <div style={{
    position: "absolute",
    left: l.left,
    top: l.top,
    width: Math.max(l.width, 1),
    height: Math.max(l.height, 1)
  }}><WidgetContent layout={l} colors={props.item.colors} /></div>;
};
// Element of one draw item (not the background, which is the stage's own style). Returns the element or null.
var drawItem = function (item, i, m, hair) {
  switch (item.kind) {
    case "grid":
      return <Grid key={i} m={m} item={item} hair={hair} />;
    case "statusBar":
      return <StatusBar key={i} m={m} item={item} hair={hair} />;
    case "dots":
      return <div key={i}><Glyphs items={item.items} color="#ffffff" /></div>;
    case "saver":
      return <Saver key={i} item={item} />;
    case "widget":
      return <Widget key={i} item={item} />;
    default:
      return null;
  }
};
// The screen at props.scale: a box of the scaled size holding the keypad-pixel stage. Returns the element.
var ScreenRender = function (props) {
  var blob = props.state.blob;
  var m = (0, react.useMemo)(function () {
    return TshLayout.metricsFor(blob.width, blob.height);
  }, [blob.width, blob.height]);
  (0, react.useEffect)(function () {
    tshAssets.installTshFonts();
  }, []);
  var items = TshLayout.screenDrawList(props.state, props.screen, {
    now: props.now ?? new Date(),
    lang: props.lang,
    themes: props.themes,
    customImages: props.customImages
  });
  var background = items[0];
  var hair = 1 / props.scale;
  return <div style={{
    position: "absolute",
    left: 0,
    top: 0,
    width: m.width * props.scale,
    height: m.height * props.scale,
    overflow: "hidden",
    pointerEvents: "none"
  }}><div style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: m.width,
      height: m.height,
      transform: `scale(${props.scale})`,
      transformOrigin: "0 0",
      backgroundColor: background.color,
      backgroundImage: background.url ? `url("${background.url}")` : background.file ? `url("${tshAssets.tshAssetUrl(background.file)}")` : "none",
      backgroundSize: "100% 100%"
    }}>{items.slice(1).map(function (item, i) {
        return drawItem(item, i, m, hair);
      })}</div></div>;
};
exports.TshScreenRender = react.memo(ScreenRender, function (prev, next) {
  return prev.screen === next.screen && prev.scale === next.scale && prev.themes === next.themes &&
    prev.customImages === next.customImages && prev.now === next.now && prev.lang === next.lang;
});
