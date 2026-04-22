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

  // ── PAGE 1: System Title & Purpose ──────────────────────────────────────────
  doc.setFontSize(28);
  doc.setTextColor(15, 17, 23);
  doc.setFont(undefined, "bold");
  const titleLines = doc.splitTextToSize(
    state.system.title || "Untitled System",
    pageW - margin * 2,
  );
  doc.text(titleLines, margin, y + 10);
  y += titleLines.length * 12 + 8;

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
  const viewport = document.querySelector(".react-flow__viewport");
  if (viewport && rfInstance) {
    // Smart zoom fitting view before snapshot
    rfInstance.fitView({ padding: 0.2, duration: 0 });
    // Allow React Flow to render before taking screenshot
    await new Promise((r) => setTimeout(r, 150));

    const canvas = await html2canvas(viewport, {
      backgroundColor: "#0f1117",
      scale: 2,
      useCORS: true,
      logging: false,
    });
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

  state.elements.forEach((el, idx) => {
    // Collect interactions
    const connectedTo = state.interactions.filter((i) => i.source === el.id);
    const connectedFrom = state.interactions.filter((i) => i.target === el.id);
    const interactionStrings = [];
    connectedTo.forEach((ix) => {
      const tgt = elementById[ix.target]?.data?.label || "Unknown";
      interactionStrings.push(`${ix.data?.isBidirectional ? "⇄" : "→"} ${tgt}`);
    });
    connectedFrom.forEach((ix) => {
      const src = elementById[ix.source]?.data?.label || "Unknown";
      interactionStrings.push(`${ix.data?.isBidirectional ? "⇄" : "←"} ${src}`);
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
  state.interactions.forEach((ix, idx) => {
    const srcLabel = elementById[ix.source]?.data?.label || ix.source;
    const tgtLabel = elementById[ix.target]?.data?.label || ix.target;
    const dir = ix.data?.isBidirectional ? "Two-way" : "One-way";
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

    const bg = idx % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
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
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Causal Mapper — Interaction Matrix", margin, pageH - 6);

  // Save
  const safeName = (state.system.title || "system")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  doc.save(`${safeName}_system_document.pdf`);
}
