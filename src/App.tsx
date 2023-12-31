import { SimplePool, Event } from "nostr-tools";

import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import "./App.css";
import CreateNote from "./Components/CreateNote";

import { insertEventIntoDescendingList } from "./utils/helperFunctions";

export const RELAYS = [
  "wss://nos.lol",
"wss://relay.damus.io",
"wss://eden.nostr.land",
"wss://nostr.wine",
"wss://relay.snort.social",
"wss://relay.nostr.band",
"wss://nostr.bitcoiner.social",
"wss://nostr-pub.wellorder.net",
"wss://relay.nostr.bg",
"wss://nostr.mom",
"wss://relay.orangepill.dev",
"wss://relay.nostr.com.au",
"wss://offchain.pub",
"wss://relay.plebstr.com",
"wss://nostr.fmt.wiz.biz",
"wss://nostr.rocks",
"wss://nostr.mutinywallet.com",
"wss://e.nos.lol",
"wss://purplepag.es",
"wss://nostr-relay.nokotaro.com",
"wss://filter.nostr.wine",
"wss://relayable.org",
"wss://relay.mostr.pub",
"wss://nostr.mutinywallet.com",
];

export interface Metadata {
  name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
}

function App() {
  const [pool, setPool] = useState<SimplePool | null>(null);

  const [eventsImmediate, setEvents] = useState<Event[]>([]);

  const [events] = useDebounce(eventsImmediate, 1500);

  const [, setMetadata] = useState<Record<string, Metadata>>({});

  const metadataFetched = useRef<Record<string, boolean>>({});

  const [hashtags, ] = useState<string[]>([]);

  // setup a relays pool

  useEffect(() => {
    const _pool = new SimplePool();
    setPool(_pool);

    return () => {
      _pool.close(RELAYS);
    };
  }, []);

  // subscribe to some events
  useEffect(() => {
    if (!pool) return;

    setEvents([]);
    const sub = pool.sub(RELAYS, [
      {
        kinds: [1],
        limit: 100,
        "#t": hashtags,
      },
    ]);

    sub.on("event", (event: Event) => {
      setEvents((events) => insertEventIntoDescendingList(events, event));
    });

    return () => {
      sub.unsub();
    };
  }, [hashtags, pool]);

  useEffect(() => {
    if (!pool) return;

    const pubkeysToFetch = events
      .filter((event) => metadataFetched.current[event.pubkey] !== true)
      .map((event) => event.pubkey);

    pubkeysToFetch.forEach(
      (pubkey) => (metadataFetched.current[pubkey] = true)
    );

    const sub = pool.sub(RELAYS, [
      {
        kinds: [0],
        authors: pubkeysToFetch,
      },
    ]);

    sub.on("event", (event: Event) => {
      const metadata = JSON.parse(event.content) as Metadata;

      setMetadata((cur) => ({
        ...cur,
        [event.pubkey]: metadata,
      }));
    });

    sub.on("eose", () => {
      sub.unsub();
    });

    return () => {};
  }, [events, pool]);

  if (!pool) return null;

  return (
    <div className="app">
      <div className="flex flex-col  gap-16">
        <h1 className="text-lg text-gray-300 font-bold ">Quick Notes by{" "}
        <a href="/"  rel="noopener noreferrer">
          NostrNet
        </a></h1>
        <CreateNote pool={pool} hashtags={hashtags} />

      </div>
    </div>
  );
}

export default App;
