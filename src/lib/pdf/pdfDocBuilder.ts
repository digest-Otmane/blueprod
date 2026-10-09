/**
 * Pure TypeScript PDF 1.4 Document Builder for La Varenne / Alea Food CRM.
 * Generates standards-compliant, standalone PDF binaries without any external npm packages.
 */

export interface ColorRGB {
  r: number; // 0 to 1
  g: number; // 0 to 1
  b: number; // 0 to 1
}

export function hexToRgb(hex: string): ColorRGB {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (clean.length === 3) {
    const r = ((num >> 8) & 0xf) * 17;
    const g = ((num >> 4) & 0xf) * 17;
    const b = (num & 0xf) * 17;
    return { r: r / 255, g: g / 255, b: b / 255 };
  }
  return {
    r: ((num >> 16) & 0xff) / 255,
    g: ((num >> 8) & 0xff) / 255,
    b: (num & 0xff) / 255,
  };
}

/**
 * Escapes strings for PDF literal strings ( ... ) using WinAnsiEncoding byte values.
 */
export function escapePdfWinAnsi(str: string): string {
  if (!str) return "";
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = ch.charCodeAt(0);

    switch (ch) {
      case "(":
        out += "\\(";
        break;
      case ")":
        out += "\\)";
        break;
      case "\\":
        out += "\\\\";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\n":
        out += "\\n";
        break;
      case "\t":
        out += "\\t";
        break;
      // French accents & common Latin-1 symbols mapped to WinAnsi
      case "é":
        out += "\\351";
        break;
      case "è":
        out += "\\350";
        break;
      case "ê":
        out += "\\352";
        break;
      case "ë":
        out += "\\353";
        break;
      case "à":
        out += "\\340";
        break;
      case "â":
        out += "\\342";
        break;
      case "î":
        out += "\\356";
        break;
      case "ï":
        out += "\\357";
        break;
      case "ô":
        out += "\\364";
        break;
      case "ù":
        out += "\\371";
        break;
      case "û":
        out += "\\373";
        break;
      case "ç":
        out += "\\347";
        break;
      case "É":
        out += "\\311";
        break;
      case "È":
        out += "\\310";
        break;
      case "Ê":
        out += "\\312";
        break;
      case "À":
        out += "\\300";
        break;
      case "Ç":
        out += "\\307";
        break;
      case "°":
        out += "\\260";
        break;
      case "’":
      case "‘":
        out += "'";
        break;
      case "“":
      case "”":
        out += "\\\"";
        break;
      case "«":
        out += "\\253";
        break;
      case "»":
        out += "\\273";
        break;
      case "–":
      case "—":
        out += "-";
        break;
      case "€":
        out += "\\200";
        break;
      case "œ":
        out += "\\234";
        break;
      case "Œ":
        out += "\\214";
        break;
      case "…":
        out += "...";
        break;
      case "\u00A0":
      case "\u202F":
        out += " ";
        break;
      default:
        if (code >= 32 && code <= 126) {
          out += ch;
        } else if (code <= 255) {
          out += "\\" + code.toString(8).padStart(3, "0");
        } else {
          // Unsupported unicode character replacement
          out += " ";
        }
    }
  }
  return out;
}

/**
 * Calculates string width for Helvetica / Helvetica-Bold at a given font size.
 */
export function getTextWidth(text: string, fontSize: number, isBold: boolean = false): number {
  if (!text) return 0;
  let totalUnits = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= "0" && ch <= "9") {
      totalUnits += 556;
    } else if (ch === " " || ch === "." || ch === "," || ch === ":" || ch === ";") {
      totalUnits += 278;
    } else if (ch === "i" || ch === "l" || ch === "I") {
      totalUnits += isBold ? 278 : 222;
    } else if (ch === "m" || ch === "w" || ch === "M" || ch === "W") {
      totalUnits += isBold ? 880 : 833;
    } else if (ch >= "A" && ch <= "Z") {
      totalUnits += isBold ? 722 : 667;
    } else {
      totalUnits += isBold ? 556 : 500;
    }
  }
  return (totalUnits / 1000) * fontSize;
}

export type PdfFont = "F1" | "F2" | "F3"; // F1: Helvetica, F2: Helvetica-Bold, F3: Helvetica-Oblique

export interface TextOptions {
  font?: PdfFont;
  size?: number;
  color?: ColorRGB | string;
  align?: "left" | "right" | "center";
}

export class PdfDoc {
  // A4 dimensions in points (72 points/inch)
  readonly pageWidth = 595.28;
  readonly pageHeight = 841.89;

  private streamOps: string[] = [];
  private title: string = "Document";
  private subject: string = "Alea Food Document";

  constructor(title: string = "Document", subject: string = "Devis ou Facture") {
    this.title = title;
    this.subject = subject;
  }

  /**
   * Converts top-down coordinates (0 at top, 841.89 at bottom)
   * to PDF bottom-up coordinates (0 at bottom, 841.89 at top).
   */
  private toPdfY(yFromTop: number): number {
    return this.pageHeight - yFromTop;
  }

  private resolveColor(color: ColorRGB | string): ColorRGB {
    if (typeof color === "string") {
      return hexToRgb(color);
    }
    return color;
  }

  /**
   * Draws a filled and/or stroked rectangle.
   */
  drawRect(
    x: number,
    yFromTop: number,
    width: number,
    height: number,
    options?: {
      fillColor?: ColorRGB | string;
      strokeColor?: ColorRGB | string;
      lineWidth?: number;
    }
  ): void {
    const pdfY = this.toPdfY(yFromTop + height);
    let cmd = "q\n";

    if (options?.lineWidth) {
      cmd += `${options.lineWidth.toFixed(2)} w\n`;
    }

    let hasFill = false;
    let hasStroke = false;

    if (options?.fillColor) {
      const c = this.resolveColor(options.fillColor);
      cmd += `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} rg\n`;
      hasFill = true;
    }

    if (options?.strokeColor) {
      const c = this.resolveColor(options.strokeColor);
      cmd += `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} RG\n`;
      hasStroke = true;
    }

    cmd += `${x.toFixed(2)} ${pdfY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re\n`;

    if (hasFill && hasStroke) {
      cmd += "B\n";
    } else if (hasFill) {
      cmd += "f\n";
    } else if (hasStroke) {
      cmd += "S\n";
    } else {
      cmd += "n\n";
    }

    cmd += "Q\n";
    this.streamOps.push(cmd);
  }

  /**
   * Draws a straight line.
   */
  drawLine(
    x1: number,
    y1FromTop: number,
    x2: number,
    y2FromTop: number,
    options?: {
      color?: ColorRGB | string;
      lineWidth?: number;
      dash?: number[];
    }
  ): void {
    const c = options?.color ? this.resolveColor(options.color) : { r: 0.2, g: 0.2, b: 0.2 };
    const w = options?.lineWidth ?? 1;

    let cmd = "q\n";
    cmd += `${w.toFixed(2)} w\n`;
    cmd += `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} RG\n`;

    if (options?.dash && options.dash.length > 0) {
      cmd += `[${options.dash.join(" ")}] 0 d\n`;
    }

    const py1 = this.toPdfY(y1FromTop);
    const py2 = this.toPdfY(y2FromTop);

    cmd += `${x1.toFixed(2)} ${py1.toFixed(2)} m ${x2.toFixed(2)} ${py2.toFixed(2)} l S\n`;
    cmd += "Q\n";

    this.streamOps.push(cmd);
  }

  /**
   * Draws text with alignment support.
   */
  drawText(text: string, x: number, yFromTop: number, options?: TextOptions): void {
    if (!text) return;

    const font = options?.font || "F1";
    const size = options?.size || 10;
    const isBold = font === "F2";
    const align = options?.align || "left";
    const c = options?.color ? this.resolveColor(options.color) : { r: 0.1, g: 0.1, b: 0.1 };

    let posX = x;
    if (align === "right") {
      posX = x - getTextWidth(text, size, isBold);
    } else if (align === "center") {
      posX = x - getTextWidth(text, size, isBold) / 2;
    }

    // Baseline adjustment: In PDF text position is specified at baseline
    const baselineY = this.toPdfY(yFromTop);
    const escaped = escapePdfWinAnsi(text);

    let cmd = "BT\n";
    cmd += `/${font} ${size.toFixed(2)} Tf\n`;
    cmd += `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} rg\n`;
    cmd += `1 0 0 1 ${posX.toFixed(2)} ${baselineY.toFixed(2)} Tm\n`;
    cmd += `(${escaped}) Tj\n`;
    cmd += "ET\n";

    this.streamOps.push(cmd);
  }

  /**
   * Assembles and returns the complete binary Buffer of the PDF 1.4 document.
   */
  toBuffer(): Buffer {
    const streamContent = this.streamOps.join("");
    const streamBuffer = Buffer.from(streamContent, "binary");
    const streamLen = streamBuffer.length;

    // We will build objects 1 through 8
    const objects: Buffer[] = [];
    const offsets: number[] = [];

    // Header
    const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");

    // Object 1: Catalog
    const obj1 = Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", "utf-8");

    // Object 2: Pages
    const obj2 = Buffer.from(
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "utf-8"
    );

    // Object 3: Page
    const obj3 = Buffer.from(
      "3 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 595.28 841.89]\n  /Contents 4 0 R\n  /Resources <<\n    /Font <<\n      /F1 5 0 R\n      /F2 6 0 R\n      /F3 7 0 R\n    >>\n  >>\n>>\nendobj\n",
      "utf-8"
    );

    // Object 4: Stream Content
    const obj4Header = Buffer.from(
      `4 0 obj\n<< /Length ${streamLen} >>\nstream\n`,
      "utf-8"
    );
    const obj4Footer = Buffer.from("\nendstream\nendobj\n", "utf-8");
    const obj4 = Buffer.concat([obj4Header, streamBuffer, obj4Footer]);

    // Object 5: Helvetica (Regular)
    const obj5 = Buffer.from(
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
      "utf-8"
    );

    // Object 6: Helvetica-Bold
    const obj6 = Buffer.from(
      "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
      "utf-8"
    );

    // Object 7: Helvetica-Oblique
    const obj7 = Buffer.from(
      "7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj\n",
      "utf-8"
    );

    // Object 8: Info
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `D:${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
      now.getHours()
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;

    const obj8 = Buffer.from(
      `8 0 obj\n<<\n  /Title (${escapePdfWinAnsi(this.title)})\n  /Author (Alea Food - La Varenne)\n  /Subject (${escapePdfWinAnsi(
        this.subject
      )})\n  /Creator (CRM La Varenne Next.js)\n  /Producer (La Varenne PDF Engine)\n  /CreationDate (${dateStr})\n>>\nendobj\n`,
      "utf-8"
    );

    objects.push(obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8);

    // Compute byte offsets for xref
    let currentOffset = header.length;
    for (let i = 0; i < objects.length; i++) {
      offsets.push(currentOffset);
      currentOffset += objects[i].length;
    }

    // xref table
    const xrefOffset = currentOffset;
    let xref = `xref\n0 ${objects.length + 1}\n`;
    xref += "0000000000 65535 f \n";
    for (let i = 0; i < offsets.length; i++) {
      const offStr = offsets[i].toString().padStart(10, "0");
      xref += `${offStr} 00000 n \n`;
    }

    // Trailer
    let trailer = "trailer\n<<\n";
    trailer += `  /Size ${objects.length + 1}\n`;
    trailer += "  /Root 1 0 R\n";
    trailer += "  /Info 8 0 R\n";
    trailer += ">>\n";
    trailer += "startxref\n";
    trailer += `${xrefOffset}\n`;
    trailer += "%%EOF\n";

    const xrefBuffer = Buffer.from(xref, "utf-8");
    const trailerBuffer = Buffer.from(trailer, "utf-8");

    return Buffer.concat([header, ...objects, xrefBuffer, trailerBuffer]);
  }
}
