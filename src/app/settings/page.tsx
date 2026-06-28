"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getContacts,
  saveContact,
  updateContact,
  deleteContact,
  MAX_CONTACTS,
  type AddressBookContact,
} from "@/src/lib/addressBook";
import { useToast } from "@/src/lib/toast";

function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface FormState {
  id: string;
  name: string;
  address: string;
}

const emptyForm: FormState = { id: "", name: "", address: "" };

export default function SettingsPage() {
  const { addToast } = useToast();
  const [contacts, setContacts] = useState<AddressBookContact[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState({ name: "", address: "" });

  const load = useCallback(() => {
    setContacts(getContacts());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function validate(): boolean {
    const errs = { name: "", address: "" };
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!form.address.trim()) errs.address = "Address is required.";
    else if (!/^G[A-Z2-7]{55}$/.test(form.address.trim()))
      errs.address = "Must be a valid Stellar public key (starts with G, 56 chars).";
    setErrors(errs);
    return !errs.name && !errs.address;
  }

  function handleSave() {
    if (!validate()) return;

    if (form.id) {
      const ok = updateContact(form.id, { name: form.name.trim(), address: form.address.trim() });
      if (ok) {
        addToast("Contact updated.", "success");
      } else {
        addToast("Failed to update contact.", "error");
      }
    } else {
      if (contacts.length >= MAX_CONTACTS) {
        addToast(`Maximum of ${MAX_CONTACTS} contacts reached.`, "error");
        return;
      }
      const contact: AddressBookContact = {
        id: generateId(),
        name: form.name.trim(),
        address: form.address.trim(),
      };
      const ok = saveContact(contact);
      if (ok) {
        addToast("Contact saved.", "success");
      } else {
        addToast("Failed to save contact.", "error");
      }
    }

    setForm(emptyForm);
    load();
  }

  function handleEdit(contact: AddressBookContact) {
    setForm({ id: contact.id, name: contact.name, address: contact.address });
    setErrors({ name: "", address: "" });
  }

  function handleDelete(id: string) {
    deleteContact(id);
    if (form.id === id) setForm(emptyForm);
    load();
    addToast("Contact deleted.", "info");
  }

  function handleCancel() {
    setForm(emptyForm);
    setErrors({ name: "", address: "" });
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Address Book</h1>

        {/* Add / Edit form */}
        <div className="bg-gray-800 rounded-xl p-6 space-y-4 mb-8">
          <h2 className="text-lg font-semibold">{form.id ? "Edit Contact" : "Add Contact"}</h2>
          <div>
            <label htmlFor="contact-name" className="text-gray-200 text-sm font-medium block mb-1">
              Name
            </label>
            <input
              id="contact-name"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="Alice"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
            />
            {errors.name && (
              <p id="contact-name-error" className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label htmlFor="contact-address" className="text-gray-200 text-sm font-medium block mb-1">
              Stellar Address
            </label>
            <input
              id="contact-address"
              value={form.address}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, address: e.target.value }));
                setErrors((prev) => ({ ...prev, address: "" }));
              }}
              placeholder="G..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "contact-address-error" : undefined}
            />
            {errors.address && (
              <p id="contact-address-error" className="text-red-400 text-xs mt-1">{errors.address}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              {form.id ? "Update" : "Save"}
            </button>
            {form.id && (
              <button
                onClick={handleCancel}
                className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Contact list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {contacts.length}/{MAX_CONTACTS} contacts
            </p>
          </div>

          {contacts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No saved contacts yet.</p>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{contact.name}</p>
                  <p className="text-gray-500 text-xs font-mono truncate">{truncateAddress(contact.address)}</p>
                </div>
                <button
                  onClick={() => handleEdit(contact)}
                  className="text-gray-400 hover:text-white text-sm px-2 py-1 transition-colors"
                  aria-label={`Edit ${contact.name}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="text-red-400 hover:text-red-300 text-sm px-2 py-1 transition-colors"
                  aria-label={`Delete ${contact.name}`}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
