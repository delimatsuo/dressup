import React from 'react';
import { render, screen } from '@testing-library/react';

function TestComponent() {
  return <div>Hello Minimal Test</div>;
}

describe('Minimal Test', () => {
  it('should render the component', () => {
    render(<TestComponent />);
    expect(screen.getByText('Hello Minimal Test')).toBeInTheDocument();
  });
});
