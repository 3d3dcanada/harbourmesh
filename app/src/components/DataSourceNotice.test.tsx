import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataSourceNotice } from './DataSourceNotice';

describe('DataSourceNotice', () => {
  it('renders a status notice for demo or simulated data surfaces', () => {
    render(
      <DataSourceNotice title="Demo data">
        Sample records are displayed until user-owned data exists.
      </DataSourceNotice>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Demo data');
    expect(screen.getByRole('status')).toHaveTextContent('Sample records are displayed');
  });
});
