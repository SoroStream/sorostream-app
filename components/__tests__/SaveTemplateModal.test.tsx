/**
 * SaveTemplateModal must not save a template whose name collides with a
 * built-in template (case and surrounding whitespace ignored): the picker
 * would otherwise show two indistinguishable entries. A unique name saves
 * normally.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import SaveTemplateModal from '../SaveTemplateModal';
import { BUILT_IN_TEMPLATES, getSavedTemplates } from '@/src/lib/streamTemplates';

const addToast = vi.fn();
vi.mock('@/src/lib/toast', () => ({ useToast: () => ({ addToast }) }));

function renderModal(onClose = vi.fn()) {
  render(<SaveTemplateModal open onClose={onClose} durationSeconds={14 * 86400} amount="250" />);
  return onClose;
}

const nameInput = () => screen.getByLabelText('Template Name');
const saveButton = () => screen.getByRole('button', { name: 'Save' });

describe('SaveTemplateModal name collisions', () => {
  beforeEach(() => {
    localStorage.clear();
    addToast.mockClear();
  });

  it('warns about and refuses a name used by a built-in template', () => {
    const onClose = renderModal();
    const builtIn = BUILT_IN_TEMPLATES[0].label; // "Biweekly payroll"

    fireEvent.change(nameInput(), { target: { value: builtIn } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      `“${builtIn}” is a built-in template. Choose a different name.`,
    );
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(saveButton()).toBeDisabled();

    // Even a forced submit (e.g. pressing Enter) does not save.
    fireEvent.submit(saveButton().closest('form')!);
    expect(getSavedTemplates()).toHaveLength(0);
    expect(addToast).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('treats differently-cased or padded names as the same built-in', () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: '  MONTHLY salary ' } });
    expect(screen.getByRole('alert')).toHaveTextContent('“Monthly salary” is a built-in template.');
    expect(saveButton()).toBeDisabled();
  });

  it('clears the warning once the name is made distinct', () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: 'Monthly salary' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(nameInput(), { target: { value: 'Monthly salary (contractors)' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it('saves a unique name normally', () => {
    const onClose = renderModal();
    fireEvent.change(nameInput(), { target: { value: 'Contributor payout' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(saveButton());

    const saved = getSavedTemplates();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ label: 'Contributor payout', days: 14, suggestedAmount: '250' });
    expect(addToast).toHaveBeenCalledWith('Template saved successfully!', 'success');
    expect(onClose).toHaveBeenCalled();
  });
});
