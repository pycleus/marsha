import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { Button } from '.';

const Icon = jest.fn(() => <span>icon</span>);
const Badge = () => <span>badge</span>;

describe('<Button />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Button component with its title only', () => {
    render(<Button label="Button" />);

    screen.getByRole('button', { name: /Button/i });
  });

  it('calls onCLick when clicking the button', () => {
    const onClick = jest.fn();

    render(<Button label="Button" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: /Button/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render the badge if there is no Icon set', () => {
    render(<Button label="Button" badge={<Badge />} />);

    screen.getByRole('button', { name: /Button/i });
    expect(screen.queryByText('badge')).not.toBeInTheDocument();
  });

  it('renders the Button component with default style', () => {
    render(<Button label="Button" Icon={Icon} badge={<Badge />} />);

    screen.getByRole('button', { name: /Button/i });

    screen.getByText('icon');
    expect(Icon).toHaveBeenCalledTimes(1);
    expect(Icon).toHaveBeenCalledWith(
      {
        height: '100%',
        iconColor: '#055fd2',
        focusColor: 'none',
      },
      {},
    );

    screen.getByText('badge');
  });

  it('renders the Button component with default style disabled', () => {
    render(<Button label="Button" Icon={Icon} badge={<Badge />} disabled />);

    screen.getByRole('button', { name: /Button/i });

    screen.getByText('icon');
    expect(Icon).toHaveBeenCalledTimes(1);
    expect(Icon).toHaveBeenCalledWith(
      {
        height: '100%',
        iconColor: '#81ade6',
        focusColor: 'none',
      },
      {},
    );

    screen.getByText('badge');
  });

  it('renders the Button component with default style hovered', () => {
    render(<Button label="Button" Icon={Icon} badge={<Badge />} />);

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Button/i }));

    screen.getByText('icon');
    expect(Icon).toHaveBeenCalledTimes(2);
    expect(Icon).toHaveBeenNthCalledWith(
      1,
      {
        height: '100%',
        iconColor: '#055fd2',
        focusColor: 'none',
      },
      {},
    );
    expect(Icon).toHaveBeenNthCalledWith(
      2,
      {
        height: '100%',
        iconColor: '#ffffff',
        focusColor: '#031963',
      },
      {},
    );

    screen.getByText('badge');
  });

  it('renders the Button component with reversed style', () => {
    render(<Button label="Button" Icon={Icon} badge={<Badge />} reversed />);

    screen.getByRole('button', { name: /Button/i });

    screen.getByText('icon');
    expect(Icon).toHaveBeenCalledTimes(1);
    expect(Icon).toHaveBeenCalledWith(
      {
        height: '100%',
        iconColor: '#ffffff',
        focusColor: '#031963',
      },
      {},
    );

    screen.getByText('badge');
  });

  it('renders the Button component with reversed style disabled', () => {
    render(
      <Button label="Button" Icon={Icon} badge={<Badge />} disabled reversed />,
    );

    screen.getByRole('button', { name: /Button/i });

    screen.getByText('icon');
    expect(Icon).toHaveBeenCalledTimes(1);
    expect(Icon).toHaveBeenCalledWith(
      {
        height: '100%',
        iconColor: '#ffffff',
        focusColor: '#81ade6',
      },
      {},
    );

    screen.getByText('badge');
  });

  it('renders the Button component with reversed style hovered', () => {
    render(<Button label="Button" Icon={Icon} badge={<Badge />} reversed />);

    fireEvent.mouseEnter(screen.getByRole('button'));

    screen.getByRole('button', { name: /Button/i });

    screen.getByText('icon');
    expect(Icon).toHaveBeenCalledTimes(2);
    expect(Icon).toHaveBeenNthCalledWith(
      1,
      {
        height: '100%',
        iconColor: '#ffffff',
        focusColor: '#031963',
      },
      {},
    );
    expect(Icon).toHaveBeenNthCalledWith(
      2,
      {
        height: '100%',
        iconColor: '#055fd2',
        focusColor: 'none',
      },
      {},
    );

    screen.getByText('badge');
  });
});
