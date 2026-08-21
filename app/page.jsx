"use client";

import { useEffect, useRef, useState } from "react";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import { AudioLines, Check, ChevronDown, Clipboard, Download, FileAudio, FileText, KeyRound, Moon, Play, Settings, Sun, Upload, X } from "lucide-react";

const FASTAPI_URL = (import.meta.env.VITE_FASTAPI_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");

const demoSummary = {
  overview: "Upload a meeting recording to turn the conversation into a clear brief with decisions, owners, and next steps.",
  keyDecisions: ["Your key decisions will appear here after processing."],
  actionItems: [],
};

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportPdf(transcript, summary) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const left = 54;
  const width = 487;
  let y = 58;
  const addText = (text, size, color, spacing = 18, bold = false) => {
    pdf.setFont("times", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(String(text || ""), width);
    let start = 0;
    while (start < lines.length) {
      if (y + spacing > 790) { pdf.addPage(); y = 58; }
      const availableLines = Math.max(1, Math.floor((790 - y) / spacing));
      const pageLines = lines.slice(start, start + availableLines);
      pdf.text(pageLines, left, y, { baseline: "top" });
      y += pageLines.length * spacing;
      start += pageLines.length;
      if (start < lines.length) { pdf.addPage(); y = 58; }
    }
  };
  const addSection = (heading, content) => {
    const contentLines = pdf.splitTextToSize(String(content || ""), width);
    if (y + 17 + Math.min(contentLines.length, 2) * 18 > 790) {
      pdf.addPage();
      y = 58;
    }
    addText(heading, 11, [50, 91, 67], 17, true);
    addText(content, 12, [31, 41, 34], 18);
  };
  addText("MEETING BRIEF", 11, [50, 91, 67], 16, true);
  addText("Morrow", 28, [31, 41, 34], 34, false);
  y += 12;
  addText("01  EXECUTIVE SUMMARY", 11, [50, 91, 67], 17, true);
  addText(summary.overview, 14, [31, 41, 34], 21);
  y += 12;
  addText("Key decisions", 11, [104, 115, 107], 17, true);
  summary.keyDecisions.forEach((decision, index) => addText(`${String(index + 1).padStart(2, "0")}  ${decision}`, 12, [31, 41, 34], 18));
  y += 18;
  addText("02  ACTION ITEMS", 11, [50, 91, 67], 17, true);
  if (summary.actionItems.length) summary.actionItems.forEach((item) => addText(`• ${item.task} | ${item.priority} | ${item.assignee || "Unassigned"}`, 12, [31, 41, 34], 18));
  else addText("No action items yet.", 12, [104, 115, 107], 18);
  y += 18;
  addSection("03  FULL TRANSCRIPT", transcript);
  pdf.save("meeting-brief.pdf");
}

async function exportWord(transcript, summary) {
  const heading = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 120 }, children: [new TextRun({ text, bold: true, font: "Times New Roman", size: 26, color: "325B43" })] });
  const body = (text, options = {}) => new Paragraph({ spacing: { after: 120, line: 276 }, style: "Normal", children: [new TextRun({ text: String(text || ""), font: "Times New Roman", size: 24, ...options })] });
  const children = [body("MEETING BRIEF", { bold: true, color: "325B43", size: 22 }), body("Morrow", { size: 36 }), heading("01  EXECUTIVE SUMMARY"), body(summary.overview), body("Key decisions", { bold: true, color: "68736B", size: 22 })];
  summary.keyDecisions.forEach((decision, index) => children.push(body(`${String(index + 1).padStart(2, "0")}  ${decision}`)));
  children.push(heading("02  ACTION ITEMS"));
  if (summary.actionItems.length) summary.actionItems.forEach((item) => children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 100, line: 276 }, children: [new TextRun({ text: `${item.task} | ${item.priority} | ${item.assignee || "Unassigned"}`, font: "Times New Roman", size: 24 })] })));
  else children.push(body("No action items yet.", { color: "68736B" }));
  children.push(heading("03  FULL TRANSCRIPT"), body(transcript));
  const doc = new Document({ styles: { default: { document: { run: { font: "Times New Roman", size: 24 }, paragraph: { spacing: { line: 276 } } } } }, sections: [{ properties: {}, children }] });
  saveBlob(await Packer.toBlob(doc), "meeting-brief.docx");
}

export default function Home() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("en-to-en");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState(demoSummary);
  const [checked, setChecked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [provider, setProvider] = useState("openai");
  const [providerDraft, setProviderDraft] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [modelDraft, setModelDraft] = useState("gpt-4o-mini");
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => setDark(localStorage.getItem("morrow-theme") === "dark"), []);
  useEffect(() => { const savedProvider = localStorage.getItem("morrow-ai-provider") || "openai"; const savedKey = localStorage.getItem(`morrow-${savedProvider}-key`) || ""; const savedModel = localStorage.getItem(`morrow-${savedProvider}-model`) || (savedProvider === "gemini" ? "gemini-3.6-flash" : "gpt-4o-mini"); setProvider(savedProvider); setProviderDraft(savedProvider); setApiKey(savedKey); setKeyDraft(savedKey); setModel(savedModel); setModelDraft(savedModel); }, []);
  useEffect(() => localStorage.setItem("morrow-theme", dark ? "dark" : "light"), [dark]);
  useEffect(() => {
    if (!file) { setAudioUrl(""); return undefined; }
    const url = URL.createObjectURL(file); setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = (nextFile) => {
    if (nextFile && ["audio/mpeg", "audio/wav", "audio/mp4", "audio/webm", "audio/x-m4a"].some((type) => nextFile.type === type) || nextFile?.name.match(/\.(mp3|wav|m4a|webm)$/i)) {
      setFile(nextFile); setError("");
    } else setError("Choose an MP3, WAV, M4A, or WEBM audio file.");
  };

  const processMeeting = async () => {
    if (!file) return setError("Add an audio recording first.");
    setLoading(true); setError("");
    const data = new FormData(); data.append("file", file); data.append("mode", mode);
    try {
      const response = await fetch(`${FASTAPI_URL}/process-audio`, { method: "POST", body: data, headers: { "x-ai-provider": provider, ...(apiKey ? { "x-ai-api-key": apiKey } : {}), ...(model ? { "x-ai-model": model } : {}) } });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const detail = payload?.detail || payload?.error || payload?.message || "Could not process this recording.";
        throw new Error(detail);
      }

      setTranscript(payload.transcript); setSummary(payload.summary); setChecked([]);
    } catch (processingError) {
      const message = processingError instanceof Error ? processingError.message : "Could not process this recording.";
      const friendlyMessage = message === "Failed to fetch"
        ? `Unable to reach the AI service at ${FASTAPI_URL}. Start the FastAPI backend or update the VITE_FASTAPI_URL value.`
        : message;
      setError(friendlyMessage);
    } finally { setLoading(false); }
  };

  const toggleItem = (id) => setChecked((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  return <main className={`app-shell ${dark ? "dark-mode" : ""}`}>
    <nav className="topbar sans"><div className="brand"><span className="brand-mark"><AudioLines size={18} /></span><span>Morrow</span></div><div className="nav-meta"><span className="status-dot" /> Private workspace <button className="icon-button" aria-label="API key settings" onClick={() => setShowSettings(!showSettings)}><Settings size={17} /></button><button className="icon-button" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button></div></nav>
    {showSettings && <div className="settings-panel panel-shadow sans"><div className="settings-title"><KeyRound size={17} /><strong>AI provider</strong><button className="close-settings" aria-label="Close settings" onClick={() => setShowSettings(false)}><X size={15} /></button></div><p>Choose a provider and model. Your key stays in this browser and is sent only with processing requests.</p><select className="provider-select" value={providerDraft} onChange={(event) => { const nextProvider = event.target.value; const nextModel = localStorage.getItem(`morrow-${nextProvider}-model`) || (nextProvider === "gemini" ? "gemini-3.6-flash" : "gpt-4o-mini"); setProviderDraft(nextProvider); setKeyDraft(localStorage.getItem(`morrow-${nextProvider}-key`) || ""); setModelDraft(nextModel); }}><option value="openai">OpenAI · Whisper + GPT</option><option value="gemini">Google Gemini · audio + analysis</option></select><input value={modelDraft} onChange={(event) => setModelDraft(event.target.value)} placeholder={providerDraft === "gemini" ? "gemini-3.6-flash" : "gpt-4o-mini"} autoComplete="off" /><input type="password" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} placeholder={providerDraft === "gemini" ? "API Key" : "sk-..."} autoComplete="off" /><div className="settings-actions"><button onClick={() => { const nextModel = modelDraft.trim(); localStorage.setItem(`morrow-${providerDraft}-key`, keyDraft.trim()); localStorage.setItem(`morrow-${providerDraft}-model`, nextModel); localStorage.setItem("morrow-ai-provider", providerDraft); setProvider(providerDraft); setApiKey(keyDraft.trim()); setModel(nextModel); setShowSettings(false); setError(""); }}>Save key and model</button><button className="remove-key" onClick={() => { localStorage.removeItem(`morrow-${providerDraft}-key`); setKeyDraft(""); setApiKey(""); }}>Remove key</button></div></div>}
    <section className="hero"><div><p className="eyebrow sans">MEETING INTELLIGENCE / 01</p><h1>Make the meeting<br /><em>move forward.</em></h1><p className="hero-copy">A calm place for the conversation after the conversation. Drop in a recording and leave with clarity.</p></div><div className="hero-note soft-grid"><span className="sans">TODAY&apos;S NOTE</span><strong>Less listening.<br />More doing.</strong><small>Transcripts, decisions, and owners in one considered brief.</small></div></section>
    <section className="workspace">
      <div className="upload-panel panel-shadow"><div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }} onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" hidden accept=".mp3,.wav,.m4a,.webm,audio/*" onChange={(event) => chooseFile(event.target.files[0])} />
        {file ? <><FileAudio size={29} strokeWidth={1.5} /><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to process</small><button className="clear-file sans" onClick={(event) => { event.stopPropagation(); setFile(null); }}><X size={14} /> Remove</button></> : <><div className="upload-icon"><Upload size={23} /></div><strong>Drop your recording here</strong><small>or click to browse · MP3, WAV, M4A, WEBM</small></>}
      </div>{audioUrl && <audio className="audio-player" controls src={audioUrl} />}<div className="upload-controls sans"><label>Audio language <div className="select-wrap"><select value={mode} onChange={(event) => setMode(event.target.value)}><option value="en-to-en">English audio {"to"} English transcript</option><option value="hi-to-en">Hindi audio {"to"} English transcript</option></select><ChevronDown size={16} /></div></label><button className="process-button" disabled={loading || !file} onClick={processMeeting}>{loading ? <><span className="spinner" /> Processing...</> : <><Play size={16} fill="currentColor" /> Summarize meeting</>}</button></div>{error && <p className="error sans">{error}</p>}</div>
      <div className="section-heading sans"><div><p className="eyebrow">YOUR BRIEF</p><h2>{transcript ? "The conversation, considered." : "Your next clear step."}</h2></div>{transcript && <div className="export-actions"><button className="export-button" onClick={() => exportPdf(transcript, summary)}><Download size={15} /> Export PDF</button><button className="export-button" onClick={() => exportWord(transcript, summary)}><FileText size={15} /> Export Word</button></div>}</div>
      <div className="dashboard"><article className="summary-card panel-shadow"><div className="card-label sans"><span>01</span> EXECUTIVE SUMMARY</div><p className="overview">{summary.overview}</p><div className="decisions"><h3 className="sans">Key decisions</h3>{summary.keyDecisions.map((decision, index) => <div className="decision" key={`${decision}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{decision}</p></div>)}</div></article>
        <article className="actions-card panel-shadow"><div className="card-label sans"><span>02</span> ACTION ITEMS <b>{summary.actionItems.length}</b></div>{summary.actionItems.length ? summary.actionItems.map((item) => <label className={`action-row ${checked.includes(item.id) ? "completed" : ""}`} key={item.id}><input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggleItem(item.id)} /><span className="custom-check">{checked.includes(item.id) && <Check size={13} />}</span><span className="task">{item.task}<small className="sans">{item.assignee || "Unassigned"}</small></span><span className={`priority ${item.priority.toLowerCase()} sans`}>{item.priority}</span></label>) : <div className="empty-actions"><Check size={20} /><p>No action items yet.<br /><span>They&apos;ll appear once your meeting is processed.</span></p></div>}</article></div>
      <article className="transcript-card panel-shadow"><div className="card-label sans"><span>03</span> FULL TRANSCRIPT {transcript && <button className="copy-button" onClick={() => navigator.clipboard.writeText(transcript)}><Clipboard size={14} /> Copy text</button>}</div><div className={`transcript-body ${!transcript ? "placeholder" : ""}`}>{transcript || "Your full transcript will live here, alongside the brief. Nothing gets lost in translation."}</div></article>
    </section><footer className="footer sans"><span>© 2026 Morrow</span><span>Built for thoughtful follow-through</span></footer>
  </main>;
}