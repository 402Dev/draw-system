import jsPDF from "jspdf";

// ─── Design tokens ──────────────────────────────────────────────────────────
const P = {
  bg: [255, 255, 255],
  surface: [248, 249, 252],
  border: [218, 220, 232],
  text: [22, 24, 44],
  muted: [100, 104, 132],
  light: [160, 164, 192],
  accent: [99, 102, 241],
  accentBg: [235, 236, 252],
  green: [22, 163, 74],
  blue: [37, 99, 235],
  red: [220, 38, 38],
  white: [255, 255, 255],
};

function strip(t) {
  return (t || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function tagsOf(el) {
  const t = el.data?.tags;
  if (!t) return "";
  return (
    typeof t === "string"
      ? t
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : t
  ).join(", ");
}

// Returns the label of the group that contains this element (by position bounds), or null
function groupOf(el, groups) {
  for (const grp of groups) {
    const gx = grp.position.x,
      gy = grp.position.y;
    const gw = grp.style?.width || 200,
      gh = grp.style?.height || 120;
    if (
      el.position.x >= gx &&
      el.position.x <= gx + gw &&
      el.position.y >= gy &&
      el.position.y <= gy + gh
    ) {
      return grp.data?.label || "Unnamed";
    }
  }
  return null;
}

// Returns "Internal" (same subsystem), "Cross" (different subsystems), or "" (no groups involved)
function ixScope(ix, elById, groups) {
  if (!groups.length) return "";
  const srcEl = elById[ix.source],
    tgtEl = elById[ix.target];
  if (!srcEl || !tgtEl) return "";
  const sg = groupOf(srcEl, groups),
    tg = groupOf(tgtEl, groups);
  if (sg && tg && sg === tg) return "Internal";
  if (sg && tg) return "Cross";
  return "";
}

const tc = (doc, c) => doc.setTextColor(...c);
const fc = (doc, c) => doc.setFillColor(...c);
const dc = (doc, c) => doc.setDrawColor(...c);
const bd = (doc) => doc.setFont(undefined, "bold");
const nm = (doc) => doc.setFont(undefined, "normal");
const sz = (doc, s) => doc.setFontSize(s);

function footer(doc, pageW, pageH, M, title, num) {
  dc(doc, P.border);
  doc.line(M, pageH - 10, pageW - M, pageH - 10);
  sz(doc, 7);
  nm(doc);
  tc(doc, P.light);
  doc.text(title, M, pageH - 5);
  doc.text("Page " + num, pageW - M, pageH - 5, { align: "right" });
}

function heading(doc, text, y, M, pageW) {
  sz(doc, 13);
  bd(doc);
  tc(doc, P.accent);
  doc.text(text, M, y);
  dc(doc, P.accentBg);
  doc.line(M, y + 2, pageW - M, y + 2);
  nm(doc);
  return y + 10;
}

function tHead(doc, cols, widths, y, x) {
  const W = widths.reduce((s, w) => s + w, 0);
  fc(doc, P.text);
  doc.rect(x, y, W, 8, "F");
  tc(doc, P.white);
  sz(doc, 8);
  bd(doc);
  let cx = x;
  cols.forEach((c, i) => {
    doc.text(c, cx + 3, y + 5.5);
    cx += widths[i];
  });
  nm(doc);
  return y + 8;
}

function tRow(doc, cells, widths, y, x, idx, pageH, M, headerCb) {
  const pageW = doc.internal.pageSize.getWidth();
  const W = widths.reduce((s, w) => s + w, 0);
  sz(doc, 8);
  nm(doc);
  const sets = cells.map((c, i) =>
    doc.splitTextToSize(String(c ?? ""), widths[i] - 5),
  );
  const h = Math.max(7, Math.max(...sets.map((s) => s.length)) * 4 + 4);

  if (y + h > pageH - 14) {
    doc.addPage();
    fc(doc, P.bg);
    doc.rect(0, 0, pageW, pageH, "F");
    y = M;
    if (headerCb) y = headerCb(y);
  }

  fc(doc, idx % 2 === 0 ? P.bg : P.surface);
  doc.rect(x, y, W, h, "F");
  tc(doc, P.text);
  sz(doc, 8);
  nm(doc);
  let cx = x;
  sets.forEach((lines, i) => {
    doc.text(lines, cx + 3, y + 4.5);
    cx += widths[i];
  });
  dc(doc, P.border);
  doc.rect(x, y, W, h);
  return y + h;
}

export async function overlayEdgeSvgToCanvas({
  container,
  canvas,
  scale,
  strokeColor,
  minStrokeWidth = 2,
  opacity = 0.9,
  arrowLength = 11,
  arrowWidth = 8,
}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const edgePaths = Array.from(
    container.querySelectorAll(".react-flow__edge path"),
  ).filter((path) => !path.classList.contains("react-flow__edge-interaction"));

  if (!edgePaths.length) return;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.globalAlpha = opacity;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  edgePaths.forEach((path) => {
    const d = path.getAttribute("d");
    if (!d) return;

    const color =
      path.getAttribute("stroke") || path.style.stroke || strokeColor;
    const strokeWidth = Math.max(
      Number.parseFloat(
        path.getAttribute("stroke-width") || path.style.strokeWidth,
      ) || 0,
      minStrokeWidth,
    );

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.stroke(new Path2D(d));

    const totalLength = path.getTotalLength?.();
    if (!totalLength || totalLength < 2) return;

    const tip = path.getPointAtLength(totalLength);
    const tail = path.getPointAtLength(
      Math.max(0, totalLength - arrowLength * 1.8),
    );
    const dx = tip.x - tail.x;
    const dy = tip.y - tail.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const baseX = tip.x - ux * arrowLength;
    const baseY = tip.y - uy * arrowLength;
    const px = (-uy * arrowWidth) / 2;
    const py = (ux * arrowWidth) / 2;

    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(baseX + px, baseY + py);
    ctx.lineTo(baseX - px, baseY - py);
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}

// ─── Light-theme diagram capture (also used by HTML export) ─────────────────
export async function captureCanvasLight(rfInstance) {
  const container = document.querySelector(".react-flow");
  if (!container || !rfInstance) return null;

  rfInstance.fitView({ padding: 0.25, duration: 0 });

  const injected = [];

  const light = document.createElement("style");
  light.textContent = [
    ".react-flow,.react-flow__pane,.react-flow__background{background:#f5f7ff!important}",
    ".react-flow__background-pattern{stroke:#dde0f0!important}",
    ".react-flow__node-stickyNote,.react-flow__controls,.react-flow__minimap{display:none!important}",
    ".icon-node__icon{background:#fff!important;border-color:#c8cae8!important;color:#4b50a0!important}",
    ".icon-node__label{color:#16182c!important}",
    ".group-node{background:rgba(99,102,241,0.06)!important;border-color:rgba(99,102,241,0.4)!important}",
    ".group-node__header{color:#5055a8!important}",
    ".card-node{background:#fff!important;border-color:#c8cae8!important}",
    ".card-node__header{background:#eeeef8!important;color:#16182c!important}",
    ".card-node__key,.card-node__val{color:#16182c!important}",
  ].join("");
  document.head.appendChild(light);
  injected.push(light);

  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r)),
  );
  await new Promise((r) => setTimeout(r, 400));

  const rect = container.getBoundingClientRect();
  const cW = Math.round(rect.width);
  const cH = Math.round(rect.height);
  const SCALE = 2;

  // Step 1 — capture HTML nodes (html2canvas skips SVG content entirely)
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(document.body, {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: cW,
    height: cH,
    backgroundColor: "#f5f7ff",
    scale: SCALE,
    useCORS: true,
    logging: false,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
  });

  // Step 2 — overlay edge SVG with explicit arrowheads (markers do not survive raster export reliably)
  try {
    await overlayEdgeSvgToCanvas({
      container,
      rfInstance,
      canvas,
      width: cW,
      height: cH,
      scale: SCALE,
      strokeColor: "#6366f1",
      minStrokeWidth: 2,
      opacity: 0.88,
      arrowLength: 12,
      arrowWidth: 9,
    });
  } catch {
    // edge overlay failed — nodes are still captured
  }

  injected.forEach((s) => s.remove());
  return canvas;
}

// ─── Main PDF export ─────────────────────────────────────────────────────────
export async function exportPDF(state, rfInstance) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const cW = pageW - M * 2;

  const sysTitle = state.system.title || "Untitled System";
  const iconNodes = state.elements.filter((e) => e.type === "iconNode");
  const groupNodes = state.elements.filter((e) => e.type === "groupNode");
  const cardNodes = state.elements.filter((e) => e.type === "cardNode");
  const elById = Object.fromEntries(state.elements.map((e) => [e.id, e]));
  let pageNum = 1;

  // ── PAGE 1: Overview ───────────────────────────────────────────────────────
  fc(doc, P.bg);
  doc.rect(0, 0, pageW, pageH, "F");

  // Header banner
  fc(doc, P.accent);
  doc.rect(0, 0, pageW, 22, "F");
  sz(doc, 17);
  bd(doc);
  tc(doc, P.white);
  doc.text(sysTitle, M, 15);
  if (state.system.organization || state.system.author) {
    sz(doc, 8.5);
    nm(doc);
    doc.text(
      [state.system.organization, state.system.author]
        .filter(Boolean)
        .join("  ·  "),
      pageW - M,
      15,
      { align: "right" },
    );
  }

  let y = 29;

  sz(doc, 8);
  nm(doc);
  tc(doc, P.muted);
  doc.text(
    "Generated " +
      new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    M,
    y,
  );
  y += 7;

  if (state.system.purpose) {
    sz(doc, 9);
    nm(doc);
    tc(doc, P.text);
    const purpLines = doc.splitTextToSize(strip(state.system.purpose), cW);
    const shown = purpLines.slice(0, 3);
    doc.text(shown, M, y);
    y += shown.length * 4.5 + 5;
  }

  // Stats row
  const stats = [
    { label: "Components", val: iconNodes.length },
    { label: "Interactions", val: state.interactions.length },
    { label: "Subsystems", val: groupNodes.length },
  ];
  const bW = 36,
    bH = 17;
  stats.forEach((s, i) => {
    const bx = M + i * (bW + 4);
    fc(doc, P.accentBg);
    doc.roundedRect(bx, y, bW, bH, 2, 2, "F");
    sz(doc, 15);
    bd(doc);
    tc(doc, P.accent);
    doc.text(String(s.val), bx + bW / 2, y + 10, { align: "center" });
    sz(doc, 7);
    nm(doc);
    tc(doc, P.muted);
    doc.text(s.label, bx + bW / 2, y + 15, { align: "center" });
  });
  y += bH + 6;

  // Diagram
  const diagCanvas = await captureCanvasLight(rfInstance);
  if (diagCanvas) {
    const availH = pageH - y - 15;
    const ratio = diagCanvas.width / diagCanvas.height;
    let imgW = cW,
      imgH = imgW / ratio;
    if (imgH > availH) {
      imgH = availH;
      imgW = imgH * ratio;
    }
    const imgX = M + (cW - imgW) / 2;
    dc(doc, P.border);
    fc(doc, P.surface);
    doc.roundedRect(imgX - 1, y - 1, imgW + 2, imgH + 2, 2, 2, "FD");
    doc.addImage(diagCanvas.toDataURL("image/png"), "PNG", imgX, y, imgW, imgH);
  }

  footer(doc, pageW, pageH, M, sysTitle, pageNum);

  // ── PAGE 2: Subsystems ───────────────────────────────────────────────────
  if (groupNodes.length > 0) {
    doc.addPage();
    fc(doc, P.bg);
    doc.rect(0, 0, pageW, pageH, "F");
    pageNum++;
    y = M;
    y = heading(doc, "Subsystems", y, M, pageW);

    for (const grp of groupNodes) {
      const gx = grp.position.x,
        gy = grp.position.y;
      const gw = grp.style?.width || 200,
        gh = grp.style?.height || 120;
      const members = iconNodes.filter(
        (e) =>
          e.position.x >= gx &&
          e.position.x <= gx + gw &&
          e.position.y >= gy &&
          e.position.y <= gy + gh,
      );

      const blockH = 9 + Math.max(1, members.length) * 6 + 5;
      if (y + blockH > pageH - 14) {
        doc.addPage();
        fc(doc, P.bg);
        doc.rect(0, 0, pageW, pageH, "F");
        pageNum++;
        y = M;
        y = heading(doc, "Subsystems (cont.)", y, M, pageW);
      }

      fc(doc, P.accentBg);
      doc.rect(M, y, cW, 8, "F");
      sz(doc, 9);
      bd(doc);
      tc(doc, P.accent);
      doc.text(grp.data?.label || "Unnamed Subsystem", M + 3, y + 5.5);
      y += 9;

      if (members.length === 0) {
        sz(doc, 8);
        nm(doc);
        tc(doc, P.light);
        doc.text("No components inside this subsystem.", M + 6, y + 4);
        y += 8;
      } else {
        members.forEach((el) => {
          sz(doc, 8);
          nm(doc);
          tc(doc, P.text);
          const badge = el.data?.status ? " [" + el.data.status + "]" : "";
          doc.text("  " + (el.data?.label || "Unnamed") + badge, M + 6, y + 4);
          const desc = strip(el.data?.purpose || el.data?.description || "");
          if (desc) {
            tc(doc, P.muted);
            doc.text(
              desc.length > 110 ? desc.slice(0, 110) + "..." : desc,
              M + 60,
              y + 4,
            );
          }
          y += 6;
        });
      }
      y += 4;
    }

    footer(doc, pageW, pageH, M, sysTitle, pageNum);
  }

  // ── PAGE N: System Components ─────────────────────────────────────────────
  if (iconNodes.length > 0) {
    doc.addPage();
    fc(doc, P.bg);
    doc.rect(0, 0, pageW, pageH, "F");
    pageNum++;
    y = M;
    y = heading(doc, "System Components", y, M, pageW);

    const cCols = [
      "Component",
      "Status",
      "Tags",
      "Purpose / Description",
      "Connects To",
    ];
    const cWids = [50, 22, 38, cW - 50 - 22 - 38 - 55, 55];
    y = tHead(doc, cCols, cWids, y, M);
    const cHCb = (yy) => {
      yy = heading(doc, "System Components (cont.)", yy, M, pageW);
      return tHead(doc, cCols, cWids, yy, M);
    };

    const orderMap = { active: 0, planned: 1, critical: 2, deprecated: 3 };
    const sorted = [...iconNodes].sort((a, b) => {
      const sa = orderMap[a.data?.status || ""] ?? 4;
      const sb = orderMap[b.data?.status || ""] ?? 4;
      return sa !== sb
        ? sa - sb
        : (a.data?.label || "").localeCompare(b.data?.label || "");
    });

    sorted.forEach((el, idx) => {
      const connects = state.interactions
        .filter(
          (ix) =>
            ix.source === el.id ||
            (ix.data?.isBidirectional && ix.target === el.id),
        )
        .map(
          (ix) =>
            elById[ix.source === el.id ? ix.target : ix.source]?.data?.label ||
            "?",
        )
        .join(", ");

      y = tRow(
        doc,
        [
          el.data?.label || "—",
          el.data?.status || "—",
          tagsOf(el) || "—",
          strip(el.data?.purpose || el.data?.description || ""),
          connects || "none",
        ],
        cWids,
        y,
        M,
        idx,
        pageH,
        M,
        cHCb,
      );
    });

    footer(doc, pageW, pageH, M, sysTitle, pageNum);
  }

  // ── PAGE N: Schema Cards ──────────────────────────────────────────────────
  if (cardNodes.length > 0) {
    doc.addPage();
    fc(doc, P.bg);
    doc.rect(0, 0, pageW, pageH, "F");
    pageNum++;
    y = M;
    y = heading(doc, "Schema Cards", y, M, pageW);

    const numCols = 3;
    const cardW = (cW - (numCols - 1) * 6) / numCols;
    let col = 0;
    let rowY = y;

    for (const card of cardNodes) {
      const rows = card.data?.rows || [];
      const cardH = 10 + rows.length * 5 + 4;

      if (rowY + cardH > pageH - 14 && col === 0) {
        doc.addPage();
        fc(doc, P.bg);
        doc.rect(0, 0, pageW, pageH, "F");
        pageNum++;
        y = M;
        y = heading(doc, "Schema Cards (cont.)", y, M, pageW);
        rowY = y;
      }

      const cx = M + col * (cardW + 6);
      fc(doc, P.surface);
      dc(doc, P.border);
      doc.roundedRect(cx, rowY, cardW, cardH, 2, 2, "FD");
      fc(doc, P.accentBg);
      doc.roundedRect(cx, rowY, cardW, 8, 2, 2, "F");
      sz(doc, 8.5);
      bd(doc);
      tc(doc, P.accent);
      doc.text(card.data?.label || "Card", cx + 3, rowY + 5.5);

      let ry = rowY + 12;
      rows.forEach((r) => {
        sz(doc, 7.5);
        bd(doc);
        tc(doc, P.text);
        doc.text(String(r.key || ""), cx + 3, ry);
        nm(doc);
        tc(doc, P.muted);
        doc.text(String(r.value || ""), cx + cardW / 2, ry);
        ry += 5;
      });

      col++;
      if (col >= numCols) {
        col = 0;
        rowY = ry + 6;
      }
    }

    footer(doc, pageW, pageH, M, sysTitle, pageNum);
  }

  // ── PAGE N: Interactions ──────────────────────────────────────────────────
  if (state.interactions.length > 0) {
    doc.addPage();
    fc(doc, P.bg);
    doc.rect(0, 0, pageW, pageH, "F");
    pageNum++;
    y = M;
    y = heading(doc, "Interactions", y, M, pageW);

    const iCols = ["From", "To", "Dir", "Scope", "Nature of Interaction"];
    const iWids = [50, 50, 14, 26, cW - 50 - 50 - 14 - 26];
    y = tHead(doc, iCols, iWids, y, M);
    const iHCb = (yy) => {
      yy = heading(doc, "Interactions (cont.)", yy, M, pageW);
      return tHead(doc, iCols, iWids, yy, M);
    };

    let iIdx = 0;
    for (const ix of state.interactions) {
      const src = elById[ix.source]?.data?.label || ix.source;
      const tgt = elById[ix.target]?.data?.label || ix.target;
      const scope = ixScope(ix, elById, groupNodes);

      if (ix.data?.isBidirectional) {
        y = tRow(
          doc,
          [
            src,
            tgt,
            "A->B",
            scope,
            strip(ix.data?.natureAtoB || ix.data?.natureOfInteraction || ""),
          ],
          iWids,
          y,
          M,
          iIdx++,
          pageH,
          M,
          iHCb,
        );
        y = tRow(
          doc,
          [tgt, src, "B->A", scope, strip(ix.data?.natureBtoA || "")],
          iWids,
          y,
          M,
          iIdx++,
          pageH,
          M,
          iHCb,
        );
      } else {
        y = tRow(
          doc,
          [
            src,
            tgt,
            "->",
            scope,
            strip(ix.data?.natureOfInteraction || ix.data?.natureAtoB || ""),
          ],
          iWids,
          y,
          M,
          iIdx++,
          pageH,
          M,
          iHCb,
        );
      }
    }

    footer(doc, pageW, pageH, M, sysTitle, pageNum);
  }

  // ── PAGE N: Connectivity Analysis ─────────────────────────────────────────
  if (iconNodes.length > 0) {
    doc.addPage();
    fc(doc, P.bg);
    doc.rect(0, 0, pageW, pageH, "F");
    pageNum++;
    y = M;
    y = heading(doc, "Connectivity Analysis", y, M, pageW);

    sz(doc, 8);
    nm(doc);
    tc(doc, P.muted);
    doc.text(
      "Sorted by total connections. Hub = highly connected node; Source = outbound only; Sink = inbound only; Isolated = no connections.",
      M,
      y,
    );
    y += 7;

    const dCols = ["Component", "Tags", "In", "Out", "Total", "Role"];
    const dW0 = cW - 50 - 16 - 16 - 16 - 26;
    const dWids = [dW0, 50, 16, 16, 16, 26];
    y = tHead(doc, dCols, dWids, y, M);
    const dHCb = (yy) => {
      yy = heading(doc, "Connectivity Analysis (cont.)", yy, M, pageW);
      return tHead(doc, dCols, dWids, yy, M);
    };

    const connectivity = iconNodes
      .map((el) => {
        const inD = state.interactions.filter(
          (ix) =>
            ix.target === el.id ||
            (ix.data?.isBidirectional && ix.source === el.id),
        ).length;
        const outD = state.interactions.filter(
          (ix) =>
            ix.source === el.id ||
            (ix.data?.isBidirectional && ix.target === el.id),
        ).length;
        return { el, inD, outD, total: inD + outD };
      })
      .sort((a, b) => b.total - a.total);

    const maxTotal = Math.max(...connectivity.map((c) => c.total), 1);

    connectivity.forEach(({ el, inD, outD, total }, idx) => {
      const role =
        total === 0
          ? "Isolated"
          : total >= maxTotal * 0.7 && maxTotal > 2
            ? "Hub"
            : inD === 0
              ? "Source"
              : outD === 0
                ? "Sink"
                : "";
      y = tRow(
        doc,
        [el.data?.label || "?", tagsOf(el) || "—", inD, outD, total, role],
        dWids,
        y,
        M,
        idx,
        pageH,
        M,
        dHCb,
      );
    });

    footer(doc, pageW, pageH, M, sysTitle, pageNum);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  doc.save(sysTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_report.pdf");
}
