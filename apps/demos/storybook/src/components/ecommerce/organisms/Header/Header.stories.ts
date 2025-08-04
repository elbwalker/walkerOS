import type { Meta, StoryObj } from '@storybook/react';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'Ecommerce/Organisms/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['ecommerce'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Component Demo',
    onSearch: (query: string) => console.log(`Searching for: ${query}`),
    onLogin: () => alert('Login clicked'),
    onSignup: () => alert('Sign up clicked'),
  },
};

export const WithLogo: Story = {
  args: {
    title: 'Brand Store',
    logo: 'https://via.placeholder.com/120x32/1ea7fd/ffffff?text=LOGO',
    onSearch: (query: string) => console.log(`Searching for: ${query}`),
    onLogin: () => alert('Login clicked'),
    onSignup: () => alert('Sign up clicked'),
  },
};

export const LoggedInUser: Story = {
  args: {
    title: 'My Dashboard',
    user: {
      name: 'John Doe',
      avatar: 'https://i.pravatar.cc/64?img=1',
    },
    onSearch: (query: string) => console.log(`Searching for: ${query}`),
    onLogout: () => alert('Logout clicked'),
  },
};

export const NoSearch: Story = {
  args: {
    title: 'Simple App',
    showSearch: false,
    onLogin: () => alert('Login clicked'),
    onSignup: () => alert('Sign up clicked'),
  },
};

export const NoAuth: Story = {
  args: {
    title: 'Public Site',
    showAuthButtons: false,
    onSearch: (query: string) => console.log(`Searching for: ${query}`),
  },
};

export const MinimalHeader: Story = {
  args: {
    title: 'Minimal',
    showSearch: false,
    showAuthButtons: false,
  },
};
