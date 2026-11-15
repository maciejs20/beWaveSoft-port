// Date/time text of the TSH Date/time widget as TSH Soft 1.00.005 shows it (PROJEKT-TSH.md 2.6, FUN_00a9cc5c): the
// widget's format first goes through TSH's own case-sensitive replacements (lowercase m is always minutes), then
// through Delphi's FormatDateTime (FUN_0042dd1c) with the day and month names of the language, and in Polish the
// first nominative month name found is turned into the genitive ("listopad" -> "listopada"). Pure, no DOM.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.formatTshDate = exports.TSH_REPLACEMENTS = exports.LOCALES = undefined;
// Replacements TSH applies to the format before FormatDateTime, in this order (FUN_00a9cc5c with FUN_00a9ca98): each
// replaces every occurrence, left to right, without scanning the inserted text again, also inside quotes.
var TSH_REPLACEMENTS = exports.TSH_REPLACEMENTS = [["dddddd", "dd MMMM yyyy"], ["ddddd", "dd-MM-yyyy"], ["mm", "nn"],
  ["m", "n"], ["tt", "hh:nn:ss"], ["t", "hh:nn"], ["c", "yyyy-MM-dd hh:nn:ss"]];
// Genitive of each Polish month as TSH's table 0x00ade260 gives it; the nominative is LOCALES.pl.longMonths.
var PL_GENITIVE_MONTHS = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia",
  "września", "października", "listopada", "grudnia"];
// Delphi FormatSettings per language ([P] TSH's own settings 0xb0d668 were not read; Windows pl-PL and en-US values).
// Day lists start with Sunday (Delphi DayOfWeek 1).
var LOCALES = exports.LOCALES = {
  pl: {
    shortDays: ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."],
    longDays: ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"],
    shortMonths: ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
    longMonths: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień",
      "październik", "listopad", "grudzień"],
    dateSeparator: ".",
    timeSeparator: ":",
    shortDate: "dd.MM.yyyy",
    longDate: "d MMMM yyyy",
    shortTime: "hh:nn",
    longTime: "hh:nn:ss",
    am: "AM",
    pm: "PM"
  },
  en: {
    shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    longDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    longMonths: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
      "November", "December"],
    dateSeparator: "/",
    timeSeparator: ":",
    shortDate: "M/d/yyyy",
    longDate: "dddd, MMMM d, yyyy",
    shortTime: "h:nn AMPM",
    longTime: "h:nn:ss AMPM",
    am: "AM",
    pm: "PM"
  }
};
// Replaces every occurrence of a text, left to right, without scanning the inserted text. Returns the result.
var replaceAll = function (text, from, to) {
  return text.split(from).join(to);
};
// Number padded to at least count digits (Delphi AppendNumber). Returns the text.
var number = function (n, count) {
  return String(n).padStart(count, "0");
};
// Delphi FormatDateTime of a format with the settings of a locale (System.SysUtils DateTimeToString): tokens are
// case-insensitive but a run counts only the same character; M right after an H token means minutes; text in
// single or double quotes is literal; other characters pass through. Returns the text.
var delphiFormat = function (format, date, loc) {
  var out = "";
  var i = 0;
  var lastToken = "";
  // Length of the run of the character at i (exact character, as Delphi's GetCount). Returns the count.
  var run = function () {
    var n = 1;
    while (format[i + n] === format[i]) {
      n++;
    }
    return n;
  };
  // Tells whether an AM/PM, A/P or AMPM token follows outside quotes before the next H or A (Delphi 'H' case).
  var twelveHour = function (from) {
    var quoted = false;
    for (var p = from; p < format.length; p++) {
      var ch = format[p];
      if (ch === "'" || ch === '"') {
        quoted = !quoted;
      } else if (!quoted && (ch === "h" || ch === "H")) {
        return false;
      } else if (!quoted && (ch === "a" || ch === "A")) {
        var rest = format.slice(p).toUpperCase();
        return rest.startsWith("AM/PM") || rest.startsWith("A/P") || rest.startsWith("AMPM");
      }
    }
    return false;
  };
  while (i < format.length) {
    var starter = format[i];
    var token = starter.toUpperCase();
    var letter = token >= "A" && token <= "Z";
    if (letter) {
      if (token === "M" && lastToken === "H") {
        token = "N";
      }
      lastToken = token;
    }
    var count = run();
    var rest = format.slice(i).toUpperCase();
    switch (token) {
      case "Y":
        out += count <= 2 ? number(date.getFullYear() % 100, 2) : number(date.getFullYear(), 4);
        break;
      case "M":
        out += count <= 2 ? number(date.getMonth() + 1, count) : count === 3 ? loc.shortMonths[date.getMonth()] :
          loc.longMonths[date.getMonth()];
        break;
      case "D":
        out += count <= 2 ? number(date.getDate(), count) : count === 3 ? loc.shortDays[date.getDay()] :
          count === 4 ? loc.longDays[date.getDay()] : delphiFormat(count === 5 ? loc.shortDate : loc.longDate, date, loc);
        break;
      case "H":
        var h = date.getHours();
        if (twelveHour(i + count)) {
          h = h % 12 === 0 ? 12 : h % 12;
        }
        out += number(h, Math.min(count, 2));
        break;
      case "N":
        out += number(date.getMinutes(), Math.min(count, 2));
        break;
      case "S":
        out += number(date.getSeconds(), Math.min(count, 2));
        break;
      case "Z":
        out += number(date.getMilliseconds(), Math.min(count, 3));
        break;
      case "T":
        out += delphiFormat(count === 1 ? loc.shortTime : loc.longTime, date, loc);
        break;
      case "C":
        out += delphiFormat(loc.shortDate, date, loc);
        if (date.getHours() || date.getMinutes() || date.getSeconds() || date.getMilliseconds()) {
          out += " " + delphiFormat(loc.longTime, date, loc);
        }
        break;
      case "A":
        // AM/PM and A/P copy the matching half from the format itself; AMPM uses the locale strings.
        var pm = date.getHours() >= 12;
        if (rest.startsWith("AM/PM")) {
          out += format.substr(i + (pm ? 3 : 0), 2);
          count = 5;
        } else if (rest.startsWith("A/P")) {
          out += format.substr(i + (pm ? 2 : 0), 1);
          count = 3;
        } else if (rest.startsWith("AMPM")) {
          out += pm ? loc.pm : loc.am;
          count = 4;
        } else if (rest.startsWith("AAAA")) {
          out += loc.longDays[date.getDay()];
          count = 4;
        } else if (rest.startsWith("AAA")) {
          out += loc.shortDays[date.getDay()];
          count = 3;
        } else {
          out += starter;
          count = 1;
        }
        break;
      case "/":
        out += loc.dateSeparator;
        count = 1;
        break;
      case ":":
        out += loc.timeSeparator;
        count = 1;
        break;
      case "'":
      case '"':
        var end = format.indexOf(starter, i + 1);
        out += format.slice(i + 1, end < 0 ? format.length : end);
        count = (end < 0 ? format.length : end + 1) - i;
        break;
      default:
        out += starter;
        count = 1;
    }
    i += count;
  }
  return out;
};
// Text of a Date/time widget: format (the widget's format string), date (a Date), lang (the TSH input language; "pl"
// for Polish names and the genitive month, anything else English). Returns the text ("" for an empty format).
exports.formatTshDate = function (format, date, lang) {
  var polish = String(lang ?? "").toLowerCase() === "pl";
  var loc = polish ? LOCALES.pl : LOCALES.en;
  var f = TSH_REPLACEMENTS.reduce(function (text, r) {
    return replaceAll(text, r[0], r[1]);
  }, String(format ?? ""));
  var text = delphiFormat(f, date, loc);
  if (polish) {
    var month = LOCALES.pl.longMonths.findIndex(function (name) {
      return text.indexOf(name) >= 0;
    });
    if (month >= 0) {
      text = replaceAll(text, LOCALES.pl.longMonths[month], PL_GENITIVE_MONTHS[month]);
    }
  }
  return text;
};
