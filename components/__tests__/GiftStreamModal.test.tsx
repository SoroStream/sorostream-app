/**
 * Issue #547 — GiftStreamModal must validate the gift message against the
 * Stellar memo limit (28 bytes) before submitting, so a long message is never
 * silently truncated on-chain.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { createStream, addToast } = vi.hoisted(() => ({
  createStream: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock('@/src/lib/sorostream', () => ({
  sorostream: { createStream },
}));

vi.mock('@/src/context/WalletContext', () => ({
  useWallet: () => ({
    address: 'GBKLYONWFBQFBFZK6HMTXQZJNBKQEXZ3PJOVXNKZXVTV4FQXVMKLKHA',
  }),
}));

vi.mock('@/src/lib/toast', () => ({
  useToast: () => ({ addToast }),
}));

import GiftStreamModal, {
  GIFT_MESSAGE_MAX_CHARS,
  validateGiftMessage,
} from '../GiftStreamModal';

const RECIPIENT = 'GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO';
const GIFT_MESSAGES_KEY = 'sorostream-gift-messages';

function renderModal() {
  return render(<GiftStreamModal onClose={vi.fn()} />);
}

function typeMessage(value: string) {
  const textarea = screen.getByLabelText(/gift message/i);
  fireEvent.change(textarea, { target: { value } });
  return textarea;
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/recipient address/i), {
    target: { value: RECIPIENT },
  });
  fireEvent.change(screen.getByLabelText(/total amount/i), {
    target: { value: '100' },
  });
}

describe('validateGiftMessage (#547)', () => {
  it('accepts an empty message (the field is optional)', () => {
    expect(validateGiftMessage('')).toBe('');
  });

  it(`accepts a message of exactly ${GIFT_MESSAGE_MAX_CHARS} characters`, () => {
    expect(validateGiftMessage('a'.repeat(GIFT_MESSAGE_MAX_CHARS))).toBe('');
  });

  it('rejects a message of exactly 29 characters', () => {
    const err = validateGiftMessage('a'.repeat(GIFT_MESSAGE_MAX_CHARS + 1));
    expect(err).toMatch(/too long/i);
    expect(err).toContain(String(GIFT_MESSAGE_MAX_CHARS));
  });

  it('rejects a multi-byte message that fits the char count but exceeds 28 bytes', () => {
    // 10 gift emoji = 20 UTF-16 chars but 40 UTF-8 bytes.
    const err = validateGiftMessage('\u{1F381}'.repeat(10));
    expect(err).toMatch(/too long/i);
  });
});

describe('GiftStreamModal message length validation (#547)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders a character/byte counter against the 28-byte memo limit', () => {
    renderModal();
    expect(screen.getByTestId('gift-message-counter')).toHaveTextContent(
      `0/${GIFT_MESSAGE_MAX_CHARS} characters`,
    );
  });

  it('shows no error and keeps the counter neutral at exactly 28 characters', () => {
    renderModal();
    typeMessage('a'.repeat(GIFT_MESSAGE_MAX_CHARS));

    expect(screen.queryByTestId('gift-message-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('gift-message-counter')).toHaveTextContent(
      `${GIFT_MESSAGE_MAX_CHARS}/${GIFT_MESSAGE_MAX_CHARS} characters`,
    );
  });

  it('shows an inline error at exactly 29 characters', () => {
    renderModal();
    const textarea = typeMessage('a'.repeat(GIFT_MESSAGE_MAX_CHARS + 1));

    const error = screen.getByTestId('gift-message-error');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveTextContent(/too long/i);
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea.getAttribute('aria-describedby')).toContain('gift-message-hint');
    expect(screen.getByTestId('gift-message-counter')).toHaveTextContent(
      `${GIFT_MESSAGE_MAX_CHARS + 1}/${GIFT_MESSAGE_MAX_CHARS} characters`,
    );
  });

  it('clears the inline error once the message is shortened again', () => {
    renderModal();
    typeMessage('a'.repeat(GIFT_MESSAGE_MAX_CHARS + 1));
    expect(screen.getByTestId('gift-message-error')).toBeInTheDocument();

    typeMessage('short');
    expect(screen.queryByTestId('gift-message-error')).not.toBeInTheDocument();
  });

  it('blocks submission when the message exceeds the limit', async () => {
    createStream.mockResolvedValue({ streamId: '42' });
    renderModal();
    fillRequiredFields();
    typeMessage('a'.repeat(GIFT_MESSAGE_MAX_CHARS + 1));

    fireEvent.click(screen.getByRole('button', { name: /send gift/i }));

    await waitFor(() => {
      expect(screen.getByTestId('gift-message-error')).toBeInTheDocument();
    });
    expect(createStream).not.toHaveBeenCalled();
    expect(localStorage.getItem(GIFT_MESSAGES_KEY)).toBeNull();
  });

  it('submits when the message is within the limit', async () => {
    createStream.mockResolvedValue({ streamId: '42' });
    renderModal();
    fillRequiredFields();
    typeMessage('a'.repeat(GIFT_MESSAGE_MAX_CHARS));

    fireEvent.click(screen.getByRole('button', { name: /send gift/i }));

    await waitFor(() => {
      expect(createStream).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/gift stream created/i)).toBeInTheDocument();
  });
});
