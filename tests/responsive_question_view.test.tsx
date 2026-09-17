
import React from 'react';
import QuestionView from '../src/components/room/QuestionView';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('QuestionView Responsive Layout', () => {
  test('applies responsive padding and text classes', () => {
    const mockQuestion = {
        id: '1',
        summary: 'Test Summary',
        text: 'Test Question',
        type: 'multiple_choice' as const,
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
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
    expect(outerContainer).toHaveClass('pb-4');
    expect(innerGlass).toHaveClass('p-4');
    expect(innerGlass).toHaveClass('sm:p-7');

    // Check text classes for short question
    expect(title).toHaveClass('text-lg');
    expect(title).toHaveClass('sm:text-2xl');
    expect(title).toHaveClass('md:text-3xl');
  });

  test('dynamically scales font down for long questions', () => {
    const longQuestion = {
      id: '2',
      summary: 'Long Question Summary',
      text: 'This is an exceptionally detailed and long trivia question created to test the layout engine and ensure that verbose questions spanning several sentences will automatically scale down their font size so that all options and actions remain visible on desktop without scrolling.',
      type: 'multiple_choice' as const,
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A',
      topic: 'Test'
    };

    const { container } = render(
      <QuestionView
        currentQuestion={longQuestion}
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

    const title = container.querySelector('h2') as HTMLElement;
    expect(title).toHaveClass('text-base');
    expect(title).toHaveClass('md:text-xl');
  });
});
