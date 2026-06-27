"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getContacts, type AddressBookContact } from "@/src/lib/addressBook";

interface RecipientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  error?: string;
  touched?: boolean;
}

function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function RecipientAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  touched,
}: RecipientAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<AddressBookContact[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setContacts(getContacts());
  }, []);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(value.toLowerCase()) ||
      c.address.toLowerCase().includes(value.toLowerCase()),
  );
  const showDropdown = open && filtered.length > 0;

  const select = useCallback(
    (contact: AddressBookContact) => {
      onChange(contact.address);
      setOpen(false);
      setHighlightedIdx(-1);
      inputRef.current?.focus();
    },
    [onChange],
  );

  useEffect(() => {
    setHighlightedIdx(-1);
  }, [value]);

  useEffect(() => {
    if (!showDropdown) setHighlightedIdx(-1);
  }, [showDropdown]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIdx((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIdx((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIdx >= 0 && highlightedIdx < filtered.length) {
          select(filtered[highlightedIdx]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlightedIdx(-1);
        break;
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id="recipient"
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 200);
          onBlur();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        aria-required="true"
        aria-invalid={!!(touched && error)}
        aria-describedby={touched && error ? "recipient-error" : undefined}
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        role="combobox"
        autoComplete="off"
      />
      {showDropdown && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-10 top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto"
        >
          {filtered.map((contact, idx) => (
            <li
              key={contact.id}
              role="option"
              aria-selected={highlightedIdx === idx}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                highlightedIdx === idx ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700/60"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                select(contact);
              }}
              onMouseEnter={() => setHighlightedIdx(idx)}
            >
              <span className="flex-1 truncate">{contact.name}</span>
              <span className="text-gray-500 font-mono text-xs shrink-0">{truncateAddress(contact.address)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
