"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { checkNote } from "./actions";

type Note = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
};

const initialValues = {
  title: "",
  body: "",
  tags: "",
};

const STORAGE_KEY = "markdown-notes";

export default function Home() {
  const [notes, setNotes] = useState<Note[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Note[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  });
  const [title, setTitle] = useState(initialValues.title);
  const [body, setBody] = useState(initialValues.body);
  const [tagsInput, setTagsInput] = useState(initialValues.tags);
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((note) => note.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesTag = selectedTag === "All" || note.tags.includes(selectedTag);
      const matchesSearch =
        !normalizedQuery ||
        note.title.toLowerCase().includes(normalizedQuery) ||
        note.body.toLowerCase().includes(normalizedQuery);

      return matchesTag && matchesSearch;
    });
  }, [notes, searchTerm, selectedTag]);

  async function handleSaveNote(event: React.FormEvent) {
    event.preventDefault();
    const rawTags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const result = await checkNote({ title, body, tags: rawTags });

    if (!result.valid) {
      setErrors(result.errors);
      setStatusMessage("Please fix the highlighted fields before saving.");
      return;
    }

    const sanitizedNote: Note = {
      id: editingNoteId ?? crypto.randomUUID(),
      title: result.title || title,
      body: result.body || body,
      tags: result.cleanedTags,
      createdAt: editingNoteId
        ? notes.find((note) => note.id === editingNoteId)?.createdAt ?? new Date().toISOString()
        : new Date().toISOString(),
    };

    if (editingNoteId) {
      setNotes((currentNotes) =>
        currentNotes.map((note) => (note.id === editingNoteId ? sanitizedNote : note)),
      );
      setStatusMessage("Note updated successfully.");
    } else {
      setNotes((currentNotes) => [sanitizedNote, ...currentNotes]);
      setStatusMessage("Note saved successfully.");
    }

    setEditingNoteId(null);
    setTitle(initialValues.title);
    setBody(initialValues.body);
    setTagsInput(initialValues.tags);
    setErrors({});
  }

  function handleEditNote(note: Note) {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setTagsInput(note.tags.join(", "));
    setErrors({});
    setStatusMessage("Editing note: " + note.title);
  }

  function handleCancelEdit() {
    setEditingNoteId(null);
    setTitle(initialValues.title);
    setBody(initialValues.body);
    setTagsInput(initialValues.tags);
    setErrors({});
    setStatusMessage("Edit cancelled.");
  }

  function handleDeleteNote(id: string) {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));
    if (editingNoteId === id) {
      handleCancelEdit();
    }
    setStatusMessage("Note deleted.");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.28),_transparent_22%),linear-gradient(135deg,#020617_0%,#0f172a_35%,#111827_100%)] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-900/80 via-indigo-900/80 to-slate-900 p-4 text-white shadow-[0_20px_40px_rgba(76,29,149,0.35)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200">Markdown Notes</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Capture and find your ideas</h1>
            </div>
            <div className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-50 backdrop-blur-sm">
              {notes.length} saved notes
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-5">
            <h2 className="text-xl font-semibold text-white">New note</h2>

            <form onSubmit={handleSaveNote} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={`w-full rounded-xl border bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition ${
                    errors.title ? "border-red-400 focus:border-red-500" : "border-slate-700 focus:border-violet-400"
                  }`}
                  placeholder="Shopping"
                />
                {errors.title ? <p className="mt-1 text-xs text-red-400">{errors.title}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Body (Markdown)</label>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className={`min-h-40 w-full rounded-xl border bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition ${
                    errors.body ? "border-red-400 focus:border-red-500" : "border-slate-700 focus:border-violet-400"
                  }`}
                  placeholder={"# This week\n1. **rice**\n2. milk\n\n- Another list\n- [Read more](https://example.com)"}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Supports headings, bold, numbered lists (1.) or bullets (-), and links.
                </p>
                {errors.body ? <p className="mt-1 text-xs text-red-400">{errors.body}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Tags</label>
                <input
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-violet-400"
                  placeholder="home, Food"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-400/20 transition hover:from-violet-500 hover:to-indigo-500"
                >
                  {editingNoteId ? "Update note" : "Save note"}
                </button>

                {editingNoteId ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>

              {statusMessage ? (
                <p className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
                  {statusMessage}
                </p>
              ) : null}
            </form>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.45)] sm:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="w-full md:max-w-sm">
                  <label className="mb-1 block text-sm font-medium text-slate-300">Search</label>
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-violet-400"
                    placeholder="Search title or note body"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTag("All")}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      selectedTag === "All"
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        selectedTag === tag
                          ? "bg-violet-600 text-white"
                          : "bg-slate-800 text-violet-200 hover:bg-slate-700"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.45)] sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Notes</h2>
                <span className="text-sm text-slate-400">{filteredNotes.length} visible</span>
              </div>

              {filteredNotes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/10 px-4 py-8 text-center text-slate-300">
                  No notes match
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotes.map((note) => (
                    <article key={note.id} className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/80 p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{note.title}</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {note.tags.map((tag) => (
                              <button
                                key={`${note.id}-${tag}`}
                                onClick={() => setSelectedTag(tag)}
                                className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-200 transition hover:bg-violet-500/25"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditNote(note)}
                            className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 text-sm leading-7 text-slate-200 [&_a]:text-violet-300 [&_a]:underline [&_a]:underline-offset-2 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_strong]:font-bold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
                        <ReactMarkdown
                          components={{
                            ol: ({ children }) => (
                              <ol className="my-3 list-decimal pl-6">{children}</ol>
                            ),
                            ul: ({ children }) => (
                              <ul className="my-3 list-disc pl-6">{children}</ul>
                            ),
                          }}
                        >
                          {note.body}
                        </ReactMarkdown>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
