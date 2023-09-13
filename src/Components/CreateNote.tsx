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
          placeholder="Write your note content..."
          className="w-full p-12 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          
        />
        <div className="flex my-2 justify-between">
          
          <button
            className="bg-[#3B3B3B] px-12 py-0 rounded-8 text-md font-bold hover:bg-blue-600 active:scale-90"
            onClick={handleSave}
          >
            Draft
          </button>
          <button
            className="bg-violet-600 px-12 py-4 rounded-8  font-bold hover:bg-violet-400 active:scale-90"
            onClick={(e) => handlePublish(e)}
          >
            Publish
          </button>
        </div>
      </form>

      {/* Display saved notes */}
      <div className="mt-4">
        <div className="my-4">
        <button
            className=" text-xs px-8 py-2 rounded-8 font-bold  active:scale-90"
            onClick={handleDownload}
          >
            Download Notes
          </button>
          <button
            className=" text-xs px-8 py-2 rounded-8 font-bold  active:scale-90"
            onClick={handleRestore}
          >
            Restore Notes
          </button>
          </div>
        <div className="grid grid-cols-2 gap-4">
          
          {savedNotes.map((note, index) => (
            <div
              key={index}
              className={`bg-[#3B3B3B] p-3 rounded-lg border-none shadow-xl relative ${
                index === editedNoteIndex ? "border-violet-500" : ""
              }`}
            >
              
              <div className="mb-2 text-xs font-semibold">{note}</div>
              <div className="flex justify-end space-x-5">
                <button
                  className="text-xs bg-[#242424] shadow-xl  font-semibold  px-1  py-0.5 rounded-md hover:bg-violet-500"
                  onClick={() => handleEdit(index)}
                >
                  Post/Edit
                </button>
                <button
                  className="text-xs font-semibold bg-[#242424] text-gray-300 px-1 py-0.5 rounded-md hover:bg-red-600"
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
