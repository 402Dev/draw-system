import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as LucideIcons from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

function renderMarkdown(text) {
  // Very simple markdown → plain text for PDF (bold, italic stripped)
  return (text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text || "", maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawTableRow(
  doc,
  cols,
  y,
  rowHeight,
  colWidths,
  startX,
  isHeader = false,
) {
  if (isHeader) {
    doc.setFillColor(30, 30, 30);
    doc.setTextColor(255, 255, 255);
    doc.rect(
      startX,
      y,
      colWidths.reduce((a, b) => a + b, 0),
      rowHeight,
      "F",
    );
  } else {
    doc.setTextColor(30, 30, 30);
  }
  let x = startX;
  cols.forEach((col, i) => {
    doc.setFontSize(isHeader ? 9 : 8);
    const lines = doc.splitTextToSize(col, colWidths[i] - 4);
    doc.text(lines, x + 2, y + 5);
    x += colWidths[i];
  });
  return y + rowHeight;
}

export async function exportPDF(state, rfInstance) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  let y = margin;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  // ── PAGE 1: Cover — Branding + Title ────────────────────────────────────────
  // Logo (if provided)
  if (state.system.logoUrl) {
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = state.system.logoUrl;
      });
      const logoH = 16;
      const logoW = logoH * (img.naturalWidth / img.naturalHeight);
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.naturalWidth;
      tmpCanvas.height = img.naturalHeight;
      tmpCanvas.getContext("2d").drawImage(img, 0, 0);
      doc.addImage(
        tmpCanvas.toDataURL("image/png"),
        "PNG",
        margin,
        y,
        logoW,
        logoH,
      );
      y += logoH + 6;
    } catch {
      // Logo load failed — skip it silently
    }
  }

  // Organization / author
  if (state.system.organization || state.system.author) {
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(100, 100, 120);
    const meta = [state.system.organization, state.system.author]
      .filter(Boolean)
      .join("  ·  ");
    doc.text(meta, margin, y + 5);
    y += 10;
  }

  doc.setFontSize(28);
  doc.setTextColor(15, 17, 23);
  doc.setFont(undefined, "bold");
  const titleLines = doc.splitTextToSize(
    state.system.title || "Untitled System",
    pageW - margin * 2,
  );
  doc.text(titleLines, margin, y + 10);
  y += titleLines.length * 12 + 8;

  // Timestamp
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.setTextColor(140, 140, 160);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
  y += 8;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(50, 50, 50);
  const purposeText =
    renderMarkdown(state.system.purpose) || "No purpose defined.";
  y = addWrappedText(doc, purposeText, margin, y, pageW - margin * 2, 5);

  y += 10;

  // ── PAGE 1: Visual Map (Smart Zoomed) ───────────────────────────────────────
  const container = document.querySelector(".react-flow");
  if (container && rfInstance) {
    // Step 1: Fit all nodes into view with generous padding
    rfInstance.fitView({ padding: 0.3, duration: 0 });

    // Step 2: Let overflow:visible render edge-nodes in the browser paint tree
    const noClipStyle = document.createElement("style");
    noClipStyle.id = "rf-export-noclip";
    noClipStyle.textContent =
      ".react-flow,.react-flow__renderer,.react-flow__container,.react-flow__pane" +
      "{overflow:visible!important;clip:auto!important}";
    document.head.appendChild(noClipStyle);

    // Hide sticky notes and UI chrome (controls, minimap) from the diagram screenshot
    const hideUiStyle = document.createElement("style");
    hideUiStyle.id = "rf-export-hideui";
    hideUiStyle.textContent =
      ".react-flow__node-stickyNote,.react-flow__controls,.react-flow__minimap" +
      "{display:none!important}";
    document.head.appendChild(hideUiStyle);

    // Step 3: Wait for transform + paint to settle
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    await new Promise((r) => setTimeout(r, 200));

    // Step 4: Render document.body and crop to the react-flow area.
    // Capturing document.body bypasses overflow:hidden on the container —
    // html2canvas sizes its canvas to the target element's layout box, so
    // capturing the container directly always clips content at its edges even
    // with overflow:visible set. Capturing body avoids this entirely.
    const rect = container.getBoundingClientRect();
    const canvas = await html2canvas(document.body, {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      backgroundColor: "#0f1117",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    // Step 5: Restore normal overflow and visibility
    noClipStyle.remove();
    hideUiStyle.remove();
    const imgData = canvas.toDataURL("image/png");

    const availW = pageW - margin * 2;
    const availH = pageH - y - margin; // Use remaining page height
    const ratio = canvas.width / canvas.height;

    let imgW = availW;
    let imgH = imgW / ratio;
    if (imgH > availH) {
      imgH = availH;
      imgW = imgH * ratio;
    }
    const imgX = margin + (availW - imgW) / 2;

    doc.setFillColor(15, 17, 23);
    doc.rect(imgX, y, imgW, imgH, "F"); // Background wrapper for dark map
    doc.addImage(imgData, "PNG", imgX, y, imgW, imgH);
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Causal Mapper — System Report", margin, pageH - 6);

  // ── PAGE 2+: Element Ledger (with Interactions) ─────────────────────────────
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  y = margin;
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.setTextColor(15, 17, 23);
  doc.text("System Elements & Subsystems", margin, y + 8);
  y += 16;

  // New columns: Label, Purpose, Interacts With
  const colWidths = [40, pageW / 2 - 40 - margin, pageW / 2 - margin];
  const startX = margin;
  const rowHeight = 12;

  y = drawTableRow(
    doc,
    ["Element", "Purpose", "Interacts With"],
    y,
    rowHeight,
    colWidths,
    startX,
    true,
  );

  doc.setFont(undefined, "normal");
  const elementById = Object.fromEntries(state.elements.map((e) => [e.id, e]));

  const sysElements = state.elements.filter((e) => e.type !== "stickyNote");

  sysElements.forEach((el, idx) => {
    // Only show outgoing (source) interactions for this element
    const connectedTo = state.interactions.filter((i) => i.source === el.id);
    const interactionStrings = [];
    connectedTo.forEach((ix) => {
      const tgt = elementById[ix.target]?.data?.label || "Unknown";
      interactionStrings.push(`${ix.data?.isBidirectional ? "⇄" : "→"} ${tgt}`);
    });
    const interactsText = interactionStrings.join("\n") || "None";

    const purposeText = renderMarkdown(
      el.data?.purpose || el.data?.description || "—",
    );

    const purpLines = doc.splitTextToSize(purposeText, colWidths[1] - 4);
    const intLines = doc.splitTextToSize(interactsText, colWidths[2] - 4);
    const maxLines = Math.max(purpLines.length, intLines.length);
    const actualH = Math.max(rowHeight, maxLines * 5 + 4);

    if (y + actualH > pageH - margin) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageW, pageH, "F");
      y = margin;
      y = drawTableRow(
        doc,
        ["Element", "Purpose", "Interacts With"],
        y,
        rowHeight,
        colWidths,
        startX,
        true,
      );
      doc.setFont(undefined, "normal");
    }

    const bg = idx % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(
      startX,
      y,
      colWidths.reduce((a, b) => a + b, 0),
      actualH,
      "F",
    );
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);

    doc.text(
      doc.splitTextToSize(
        el.data?.label || "Unnamed Element",
        colWidths[0] - 4,
      ),
      startX + 2,
      y + 5,
    );

    doc.text(purpLines, startX + colWidths[0] + 2, y + 5);
    doc.text(intLines, startX + colWidths[0] + colWidths[1] + 2, y + 5);

    // row border
    doc.setDrawColor(220, 220, 220);
    doc.rect(
      startX,
      y,
      colWidths.reduce((a, b) => a + b, 0),
      actualH,
    );
    y += actualH;
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Causal Mapper — Elements Ledger", margin, pageH - 6);

  // ── PAGE 3+: Interaction Details ───────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  y = margin;
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.setTextColor(15, 17, 23);
  doc.text("Interaction Details", margin, y + 8);
  y += 16;

  const iColWidths = [45, 45, 25, pageW - margin * 2 - 45 - 45 - 25];
  y = drawTableRow(
    doc,
    ["Source", "Target", "Directionality", "Nature of Interaction"],
    y,
    rowHeight,
    iColWidths,
    startX,
    true,
  );

  // The elementById object is already defined above, reuse it
  let rowIdx = 0;
  state.interactions.forEach((ix) => {
    const srcLabel = elementById[ix.source]?.data?.label || ix.source;
    const tgtLabel = elementById[ix.target]?.data?.label || ix.target;
    if (ix.data?.isBidirectional) {
      // A → B
      const dirAB = "A→B";
      const natureAB = renderMarkdown(ix.data?.natureAtoB);
      const natureLinesAB = doc.splitTextToSize(
        natureAB || "—",
        iColWidths[3] - 4,
      );
      let actualH = Math.max(rowHeight, natureLinesAB.length * 5 + 4);
      if (y + actualH > pageH - margin) {
        doc.addPage();
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageW, pageH, "F");
        y = margin;
        y = drawTableRow(
          doc,
          ["Source", "Target", "Directionality", "Nature of Interaction"],
          y,
          rowHeight,
          iColWidths,
          startX,
          true,
        );
        doc.setFont(undefined, "normal");
      }
      const bg = rowIdx % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(
        startX,
        y,
        iColWidths.reduce((a, b) => a + b, 0),
        actualH,
        "F",
      );
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(
        doc.splitTextToSize(srcLabel, iColWidths[0] - 4),
        startX + 2,
        y + 5,
      );
      doc.text(
        doc.splitTextToSize(tgtLabel, iColWidths[1] - 4),
        startX + iColWidths[0] + 2,
        y + 5,
      );
      doc.text(dirAB, startX + iColWidths[0] + iColWidths[1] + 2, y + 5);
      doc.text(
        natureLinesAB,
        startX + iColWidths[0] + iColWidths[1] + iColWidths[2] + 2,
        y + 5,
      );
      doc.setDrawColor(220, 220, 220);
      doc.rect(
        startX,
        y,
        iColWidths.reduce((a, b) => a + b, 0),
        actualH,
      );
      y += actualH;
      rowIdx++;
      // B → A
      const dirBA = "B→A";
      const natureBA = renderMarkdown(ix.data?.natureBtoA);
      const natureLinesBA = doc.splitTextToSize(
        natureBA || "—",
        iColWidths[3] - 4,
      );
      actualH = Math.max(rowHeight, natureLinesBA.length * 5 + 4);
      if (y + actualH > pageH - margin) {
        doc.addPage();
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageW, pageH, "F");
        y = margin;
        y = drawTableRow(
          doc,
          ["Source", "Target", "Directionality", "Nature of Interaction"],
          y,
          rowHeight,
          iColWidths,
          startX,
          true,
        );
        doc.setFont(undefined, "normal");
      }
      const bg2 = rowIdx % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
      doc.setFillColor(...bg2);
      doc.rect(
        startX,
        y,
        iColWidths.reduce((a, b) => a + b, 0),
        actualH,
        "F",
      );
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(
        doc.splitTextToSize(tgtLabel, iColWidths[0] - 4),
        startX + 2,
        y + 5,
      );
      doc.text(
        doc.splitTextToSize(srcLabel, iColWidths[1] - 4),
        startX + iColWidths[0] + 2,
        y + 5,
      );
      doc.text(dirBA, startX + iColWidths[0] + iColWidths[1] + 2, y + 5);
      doc.text(
        natureLinesBA,
        startX + iColWidths[0] + iColWidths[1] + iColWidths[2] + 2,
        y + 5,
      );
      doc.setDrawColor(220, 220, 220);
      doc.rect(
        startX,
        y,
        iColWidths.reduce((a, b) => a + b, 0),
        actualH,
      );
      y += actualH;
      rowIdx++;
    } else {
      // One-way
      const dir = "A→B";
      const nature = renderMarkdown(ix.data?.natureOfInteraction);
      const natureLines = doc.splitTextToSize(nature || "—", iColWidths[3] - 4);
      const actualH = Math.max(rowHeight, natureLines.length * 5 + 4);
      if (y + actualH > pageH - margin) {
        doc.addPage();
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageW, pageH, "F");
        y = margin;
        y = drawTableRow(
          doc,
          ["Source", "Target", "Directionality", "Nature of Interaction"],
          y,
          rowHeight,
          iColWidths,
          startX,
          true,
        );
        doc.setFont(undefined, "normal");
      }
      const bg = rowIdx % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(
        startX,
        y,
        iColWidths.reduce((a, b) => a + b, 0),
        actualH,
        "F",
      );
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(
        doc.splitTextToSize(srcLabel, iColWidths[0] - 4),
        startX + 2,
        y + 5,
      );
      doc.text(
        doc.splitTextToSize(tgtLabel, iColWidths[1] - 4),
        startX + iColWidths[0] + 2,
        y + 5,
      );
      doc.text(dir, startX + iColWidths[0] + iColWidths[1] + 2, y + 5);
      doc.text(
        natureLines,
        startX + iColWidths[0] + iColWidths[1] + iColWidths[2] + 2,
        y + 5,
      );
      doc.setDrawColor(220, 220, 220);
      doc.rect(
        startX,
        y,
        iColWidths.reduce((a, b) => a + b, 0),
        actualH,
      );
      y += actualH;
      rowIdx++;
    }
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Causal Mapper — Interaction Matrix", margin, pageH - 6);

  // ── Dependency / Impact Matrix ──────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  y = margin;
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.setTextColor(15, 17, 23);
  doc.text("Dependency & Impact Matrix", margin, y + 8);
  y += 16;

  // Compute in/out degrees for real elements (not stickyNote/groupNode)
  const realElements = state.elements.filter(
    (e) => e.type !== "stickyNote" && e.type !== "groupNode",
  );
  const spofThreshold = 3;

  const depData = realElements.map((el) => {
    const inDeg = state.interactions.filter((ix) => ix.target === el.id).length;
    const outDeg = state.interactions.filter(
      (ix) => ix.source === el.id,
    ).length;
    return {
      label: el.data?.label || "Unnamed",
      inDeg,
      outDeg,
      total: inDeg + outDeg,
      spof: inDeg + outDeg >= spofThreshold,
    };
  });
  depData.sort((a, b) => b.total - a.total);

  const dColWidths = [pageW - margin * 2 - 28 - 28 - 28 - 30, 28, 28, 28, 30];

  y = drawTableRow(
    doc,
    ["Element", "In", "Out", "Total", "Risk Flag"],
    y,
    rowHeight,
    dColWidths,
    startX,
    true,
  );
  doc.setFont(undefined, "normal");

  depData.forEach((row, idx) => {
    if (y + rowHeight > pageH - margin) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageW, pageH, "F");
      y = margin;
      y = drawTableRow(
        doc,
        ["Element", "In", "Out", "Total", "Risk Flag"],
        y,
        rowHeight,
        dColWidths,
        startX,
        true,
      );
      doc.setFont(undefined, "normal");
    }

    const bg = idx % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
    doc.setFillColor(...bg);
    const totalW = dColWidths.reduce((a, b) => a + b, 0);
    doc.rect(startX, y, totalW, rowHeight, "F");

    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(
      doc.splitTextToSize(row.label, dColWidths[0] - 4),
      startX + 2,
      y + 5,
    );
    doc.text(String(row.inDeg), startX + dColWidths[0] + 2, y + 5);
    doc.text(
      String(row.outDeg),
      startX + dColWidths[0] + dColWidths[1] + 2,
      y + 5,
    );
    doc.text(
      String(row.total),
      startX + dColWidths[0] + dColWidths[1] + dColWidths[2] + 2,
      y + 5,
    );
    if (row.spof) {
      doc.setTextColor(200, 50, 50);
      doc.text(
        "⚠ SPOF",
        startX +
          dColWidths[0] +
          dColWidths[1] +
          dColWidths[2] +
          dColWidths[3] +
          2,
        y + 5,
      );
      doc.setTextColor(30, 30, 30);
    } else {
      doc.text(
        "OK",
        startX +
          dColWidths[0] +
          dColWidths[1] +
          dColWidths[2] +
          dColWidths[3] +
          2,
        y + 5,
      );
    }

    doc.setDrawColor(220, 220, 220);
    doc.rect(startX, y, totalW, rowHeight);
    y += rowHeight;
  });

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `* SPOF Risk Flag shown when total connections ≥ ${spofThreshold}`,
    margin,
    y + 8,
  );
  doc.setFontSize(8);
  doc.text("Causal Mapper — Dependency Matrix", margin, pageH - 6);

  // Save
  const safeName = (state.system.title || "system")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  doc.save(`${safeName}_system_document.pdf`);
}
