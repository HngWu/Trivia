
import React from 'react';
import QuestionView from '../src/components/room/QuestionView';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('QuestionView Responsive Layout', () => {
  test('applies responsive padding and text classes', () => {
    const mockQuestion = {
        id: '1',
        text: 'Test Question',
        type: 'multiple_choice' as const,
        options: ['A', 'B', 'C', 'D'],
        topic: 'Test'
    };

    const { container } = render(
      <QuestionView
        currentQuestion={mockQuestion}
        roundData={{ answer: '', answerCount: 0, wager: 10 }}
        players={[]}
        isLocked={false}
        textAnswer=""
        setTextAnswer={() => {}}
        onSubmitAnswer={() => {}}
        isLeader={false}
        onForceAdvance={() => {}}
      />
    );

    const outerContainer = container.firstChild as HTMLElement;
    const innerGlass = outerContainer.querySelector('.glass') as HTMLElement;
    const title = innerGlass.querySelector('h2') as HTMLElement;

    // Check padding classes
    expect(outerContainer).toHaveClass('py-4');
    expect(innerGlass).toHaveClass('p-4');
    expect(innerGlass).toHaveClass('sm:p-12');

    // Check text classes
    expect(title).toHaveClass('text-lg');
    expect(title).toHaveClass('sm:text-2xl');
  });
});
