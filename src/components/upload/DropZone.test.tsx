import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropZone } from './DropZone';

describe('DropZone', () => {
  it('renders the upload zone', () => {
    render(<DropZone onUpload={vi.fn()} />);
    expect(screen.getByTestId('drop-zone')).toBeDefined();
    expect(screen.getByText(/drop your document here/i)).toBeDefined();
  });

  it('displays error message on invalid file type', async () => {
    render(<DropZone onUpload={vi.fn()} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const invalidFile = new File(['content'], 'malware.exe', {
      type: 'application/x-msdownload',
    });

    Object.defineProperty(input, 'files', { value: [invalidFile] });
    fireEvent.change(input);

    const error = await screen.findByTestId('error-message');
    expect(error.textContent).toMatch(/unsupported file type/i);
  });

  it('calls onUpload callback on valid file', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    render(<DropZone onUpload={onUpload} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const validFile = new File(['content'], 'chart.png', { type: 'image/png' });

    Object.defineProperty(input, 'files', { value: [validFile] });
    fireEvent.change(input);

    await vi.waitFor(() => expect(onUpload).toHaveBeenCalledWith(validFile));
  });

  it('shows "Or click to browse" text', () => {
    render(<DropZone onUpload={vi.fn()} />);
    expect(screen.getByText(/or click to browse/i)).toBeDefined();
  });

  it('accepts PDF files without error', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    render(<DropZone onUpload={onUpload} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const pdfFile = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' });

    Object.defineProperty(input, 'files', { value: [pdfFile] });
    fireEvent.change(input);

    await vi.waitFor(() => expect(onUpload).toHaveBeenCalledWith(pdfFile));
  });
});
