import React, { useState, useEffect } from "react";
import { EventTemplate, Event, getEventHash, SimplePool } from "nostr-tools";
import { RELAYS } from "../App";
import ReactMarkdown from "react-markdown";

interface Props {
  pool: SimplePool;
  hashtags: string[];
}

export default function CreateNote({ pool, hashtags }: Props) {
  const [input, setInput] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([]);
  const [editedNoteIndex, setEditedNoteIndex] = useState<number | null>(null);

  // Load saved notes from local storage on component mount
  useEffect(() => {
    const savedNotesString = localStorage.getItem("savedNotes");
    if (savedNotesString) {
      const parsedNotes = JSON.parse(savedNotesString);
      setSavedNotes(parsedNotes);
    }
  }, []);

  // Save notes to local storage whenever savedNotes change
  useEffect(() => {
    localStorage.setItem("savedNotes", JSON.stringify(savedNotes));
  }, [savedNotes]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!window.nostr) {
      alert("Nostr extension not found");
      return;
    }

    // Check if the user wants to proceed with publishing
    const confirmPublish = window.confirm(
      "Are you sure you want to publish this note to Nostr?"
    );
    if (!confirmPublish) {
      return;
    }

    // Construct the event object
    const _baseEvent = {
      content: input,
      created_at: Math.round(Date.now() / 1000),
      kind: 1,
      tags: [...hashtags.map((hashtag) => ["t", hashtag])],
    } as EventTemplate;

    // Sign this event (allow the user to sign it with their private key)
    try {
      const pubkey = await window.nostr.getPublicKey();

      const sig = await (await window.nostr.signEvent(_baseEvent)).sig;

      const event: Event = {
        ..._baseEvent,
        sig,
        pubkey,
        id: getEventHash({ ..._baseEvent, pubkey }),
      };

      const pubs = pool.publish(RELAYS, event);

      let clearedInput = false;

      pubs.on("ok", () => {
        if (clearedInput) return;

        clearedInput = true;
        setInput("");
        setEditedNoteIndex(null); // Clear the edited note index
      });
    } catch (error) {
      alert("User rejected operation");
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    setSavedNotes([...savedNotes, input]);
    setInput(""); // Clear the input field after saving
  };

  const handleEdit = (indexToEdit: number) => {
    // Set the edited note index
    setEditedNoteIndex(indexToEdit);
    setInput(savedNotes[indexToEdit]); // Set the input field content for editing
  };

  const handleDelete = (indexToDelete: number) => {
    if (editedNoteIndex !== null && editedNoteIndex === indexToDelete) {
      // If the user edited this note but didn't publish the edit, cancel the edit
      setEditedNoteIndex(null);
      setInput(""); // Clear the input field
    } else {
      // Delete the note
      const updatedNotes = savedNotes.filter(
        (_, index) => index !== indexToDelete
      );
      setSavedNotes(updatedNotes);
    }
  };

  const handleDownload = () => {
    // Download the notes as a JSON file
    const blob = new Blob([JSON.stringify(savedNotes)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saved_notes.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = () => {
    // Allow the user to restore notes from a JSON file
    const inputElement = document.createElement("input");
    inputElement.type = "file";
    inputElement.accept = "application/json";
    inputElement.addEventListener("change", (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          try {
            const parsedNotes = JSON.parse(content);
            setSavedNotes(parsedNotes);
          } catch (error) {
            alert("Invalid JSON file.");
          }
        };
        reader.readAsText(file);
      }
    });
    inputElement.click();
  };

  return (
    <div>
      <form>
        <textarea
          placeholder="Write your note here; you can save it offline or publish it on Nostr...."
          className="mainText w-full  bg-black border border-blue-500 text-lg p-12  rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={12}
        />
        <div className="flex my-2 justify-between">
          <button
            className=" shadowC  bg-[#7538d0] px-12 py-4 rounded-8 text-sm  font-bold hover:bg-violet-600 active:scale-90"
            onClick={(e) => handlePublish(e)}
          >
            Publish on Nostr
          </button>
          <button
            type="button"
            className="shadowC bg-blue-900 px-12 py-0 rounded-8 text-sm font-bold hover:bg-blue-600 active:scale-90"
            onClick={handleSave}
          >
            Save Offline
          </button>
        </div>
      </form>

      {/* Display saved notes */}
      <div className="mt-4">
        <div className="my-4">
          <button
            className=" text-sm px-8 py-2 text-gray-300 rounded-8 font-bold  active:scale-90"
            onClick={handleDownload}
          >
            Download Notes
          </button>
          <button
            className=" text-sm px-8 text-gray-300 py-2 rounded-8 font-bold  active:scale-90"
            onClick={handleRestore}
          >
            Restore Notes
          </button>
        </div>
        <div className=" grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
          {savedNotes.map((note, index) => (
            <div
              key={index}
              className={`bg-black shadowC text-gray-300   p-3 rounded-lg border-none  relative ${
                index === editedNoteIndex ? "border-violet-500" : ""
              }`}
              style={{
                // Adjust the max-width as needed
                maxHeight: "120px", // Adjust the max-height as needed
                overflow: "hidden",
              }}
            >
              <div
                className=" text-xs font-semibold"
                style={{
                  maxHeight: "92%",
                  overflowY: "auto",
                  wordWrap: "break-word", // Add word wrap to break long words
                  whiteSpace: "pre-wrap",
                }}
              >
                <div
                  style={{
                    maxHeight: "100%",
                    overflowY: "auto",
                  }}
                >
                  <ReactMarkdown>{note}</ReactMarkdown>
                </div>
              </div>
              <div className="flex py-0.5 noteList justify-end space-x-5">
                <button
                  className="text-xs bg-blue-900 shadow-xl font-semibold  px-1.5 py-0.5 rounded-md hover:bg-violet-500"
                  onClick={() => handleEdit(index)}
                >
                  Post/Edit
                </button>
                <button
                  className="text-xs font-semibold bg-[#18181a] text-gray-300 px-1.5 py-0.5 rounded-md hover:bg-red-600"
                  onClick={() => handleDelete(index)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
