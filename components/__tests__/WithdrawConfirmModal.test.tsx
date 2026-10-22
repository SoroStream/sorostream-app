import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WithdrawConfirmModal from '../WithdrawConfirmModal';

const AMOUNT = '1,234.5600000';

function renderModal(overrides?: Partial<React.ComponentProps<typeof WithdrawConfirmModal>>) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <WithdrawConfirmModal
      amount={AMOUNT}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe('WithdrawConfirmModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the amount in the description', () => {
    renderModal();
    const matches = screen.getAllByText(AMOUNT, { exact: false });
    expect(matches.length).toBeGreaterThan(0);
  });

  it('Confirm button is disabled initially', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /confirm withdrawal/i })).toBeDisabled();
  });

  it('Confirm button stays disabled when typed value does not match', () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '999' } });
    expect(screen.getByRole('button', { name: /confirm withdrawal/i })).toBeDisabled();
  });

  it('shows mismatch error when typed value is non-empty and wrong', () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'wrong' } });
    expect(screen.getByText(/amount doesn't match/i)).toBeInTheDocument();
  });

  it('Confirm button is enabled when typed value matches exactly', () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: AMOUNT } });
    expect(screen.getByRole('button', { name: /confirm withdrawal/i })).not.toBeDisabled();
  });

  it('calls onConfirm when Confirm is clicked after correct input', () => {
    const { onConfirm } = renderModal();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: AMOUNT } });
    fireEvent.click(screen.getByRole('button', { name: /confirm withdrawal/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const { onCancel } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape key is pressed', () => {
    const { onCancel } = renderModal();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not show error when input is empty', () => {
    renderModal();
    expect(screen.queryByText(/amount doesn't match/i)).not.toBeInTheDocument();
  });

  it('has the correct dialog role and aria-modal', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});

// ── Issue #543: rapid double-clicks must not submit twice ────────────────────
describe('WithdrawConfirmModal double-submit protection (#543)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onConfirm only once for two rapid clicks in the same tick', () => {
    const onConfirm = vi.fn();
    render(
      <WithdrawConfirmModal amount={AMOUNT} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: AMOUNT } });
    const confirm = screen.getByRole('button', { name: /confirm withdrawal/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button and shows a spinner while the transaction is pending', async () => {
    let resolveTx: () => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveTx = resolve;
        }),
    );
    render(
      <WithdrawConfirmModal amount={AMOUNT} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: AMOUNT } });
    fireEvent.click(screen.getByRole('button', { name: /confirm withdrawal/i }));

    const busy = await screen.findByRole('button', { name: /submitting/i });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('withdraw-confirm-spinner')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();

    resolveTx();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm withdrawal/i })).not.toBeDisabled();
    });
  });

  it('re-enables the confirm button after the transaction resolves', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <WithdrawConfirmModal amount={AMOUNT} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: AMOUNT } });
    fireEvent.click(screen.getByRole('button', { name: /confirm withdrawal/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm withdrawal/i })).not.toBeDisabled();
    });
    expect(screen.queryByTestId('withdraw-confirm-error')).not.toBeInTheDocument();
  });

  it('surfaces the failure inline and allows a retry when onConfirm rejects', async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error('tx failed'))
      .mockResolvedValueOnce(undefined);
    render(
      <WithdrawConfirmModal amount={AMOUNT} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: AMOUNT } });
    fireEvent.click(screen.getByRole('button', { name: /confirm withdrawal/i }));

    const error = await screen.findByTestId('withdraw-confirm-error');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveTextContent(/withdrawal failed/i);

    const confirm = screen.getByRole('button', { name: /confirm withdrawal/i });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('withdraw-confirm-error')).not.toBeInTheDocument();
    });
  });

  it('does not submit a second time while the first submission is still pending', async () => {
    const onConfirm = vi.fn(
      () => new Promise<void>(() => {}), // never settles
    );
    render(
      <WithdrawConfirmModal amount={AMOUNT} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: AMOUNT } });
    fireEvent.click(screen.getByRole('button', { name: /confirm withdrawal/i }));

    const busy = await screen.findByRole('button', { name: /submitting/i });
    fireEvent.click(busy);
    fireEvent.click(busy);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

