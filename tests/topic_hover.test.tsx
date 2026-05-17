import React from 'react';
import { render, screen } from '@testing-library/react';
import TopicGrid from '@/components/home/TopicGrid';
import '@testing-library/jest-dom';

const mockTopics = [
  { id: '1', name: 'Science', icon: '🧪' },
  { id: '2', name: 'History', icon: '📜' },
];

describe('TopicGrid Hover Animation', () => {
  it('applies the correct classes for scaling on hover', () => {
    render(
      <TopicGrid 
        topics={mockTopics} 
        selectedTopic="" 
        onSelect={() => {}} 
        isLoading={false} 
      />
    );

    const button = screen.getByText('Science').closest('button');
    const iconSpan = screen.getByText('🧪');

    expect(button).toHaveClass('group');
    expect(iconSpan).toHaveClass('group-hover:scale-[2]');
    expect(iconSpan).toHaveClass('inline-block');
  });

  it('verifies that the icon span has the expected base styles', () => {
    render(
      <TopicGrid 
        topics={mockTopics} 
        selectedTopic="" 
        onSelect={() => {}} 
        isLoading={false} 
      />
    );

    const iconSpan = screen.getByText('🧪');
    
    // Check for essential transform properties
    expect(iconSpan).toHaveClass('transition-all');
    expect(iconSpan).toHaveClass('will-change-transform');
  });
});
