import React, { useState, useEffect } from "react";
import { EventTemplate, Event, getEventHash, SimplePool } from "nostr-tools";
import { RELAYS } from "../App";

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

  const handleSave = () => {
    // Save the note content to local storage
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
      const updatedNotes = savedNotes.filter((_, index) => index !== indexToDelete);
      setSavedNotes(updatedNotes);
    }
  };

  return (
    <div>
      <form>
        <textarea
          placeholder="Write your note content..."
          className="w-full p-12 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
        />
        <div className="flex my-2 justify-between">
          <button
            className="bg-violet-700 px-12 py-4 rounded-8 font-bold hover:bg-violet-600 active:scale-90"
            onClick={(e) => handlePublish(e)}
          >
            Publish
          </button>
          <button
            className="bg-blue-700 px-12 py-4 rounded-8 text-md font-bold hover:bg-blue-600 active:scale-90"
            onClick={handleSave}
          >
            Draft
          </button>
        </div>
      </form>

      {/* Display saved notes */}
      <div className="mt-4">
        <h3 className="text-md font-semibold text-white my-2">Saved Notes:</h3>
        <div className="grid grid-cols-2 gap-4">
          {savedNotes.map((note, index) => (
            <div
              key={index}
              className={`bg-[#3B3B3B] p-4 rounded-lg border-none shadow-xl relative ${
                index === editedNoteIndex ? "border-yellow-500" : ""
              }`}
            >
              <div className="mb-2 text-xs font-semibold">{note}</div>
              <div className="flex justify-end space-x-3">
                <button
                  className="text-xs font-semibold bg-violet-700 px-1  py-0.5 rounded-lg hover:bg-yellow-600"
                  onClick={() => handleEdit(index)}
                >
                  Post
                </button>
                <button
                  className="text-xs font-semibold bg-red-500 px-1 py-0.5 rounded-lg hover:bg-red-600"
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
