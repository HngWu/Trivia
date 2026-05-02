import React from "react";
import { render, screen } from "@testing-library/react";
import RoomPage from "../src/app/room/[code]/page";
import { use } from "react";
import * as actions from "../src/lib/actions";

// Mocking use() for Next.js 15+ compatibility in tests
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  use: jest.fn(),
}));

// Mocking actions
jest.mock("../src/lib/actions", () => ({
  getRoomState: jest.fn(),
  updateRoomStatus: jest.fn(),
  submitWager: jest.fn(),
  submitAnswer: jest.fn(),
}));

const mockedActions = actions as jest.Mocked<typeof actions>;

describe("RoomPage UI Feedback", () => {
  const mockParams = Promise.resolve({ code: "TEST12" });

  beforeEach(() => {
    (use as jest.Mock).mockImplementation((p) => {
       if (p === mockParams) return { code: "TEST12" };
       return p;
    });
    localStorage.setItem("player_id", "p1");
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("renders 'Waiting for other players to pick' when wager is committed", async () => {
    mockedActions.getRoomState.mockResolvedValue({
      room: {
        status: "wager",
        current_question_index: 0,
        leader_id: "p1",
        questions: [{ id: "q1", summary: "Test Question", text: "What is 1+1?", correct_answer: "2", type: "multiple_choice", options: ["1", "2"] }],
        code: "TEST12",
        topic: "General"
      },
      players: [{ id: "p1", name: "Player 1", score: 0, is_leader: true }, { id: "p2", name: "Player 2", score: 0, is_leader: false }],
      allAnswers: [{ player_id: "p1", question_id: "q1", wager: 5, submitted_answer: "", is_correct: false }]
    });

    render(<RoomPage params={mockParams} />);

    // Wait for data to load
    const message = await screen.findByText(/Waiting for players/i);
    expect(message).toBeDefined();
    
    // Ensure summary is visible but text is NOT (in wager phase)
    expect(screen.getByText("Test Question")).toBeDefined();
    expect(screen.queryByText("What is 1+1?")).toBeNull();
  });

  it("renders 'Waiting for others to answer' when answer is committed", async () => {
    mockedActions.getRoomState.mockResolvedValue({
      room: {
        status: "question",
        current_question_index: 0,
        leader_id: "p1",
        questions: [{ id: "q1", summary: "Test Question", text: "What is 1+1?", correct_answer: "2", type: "multiple_choice", options: ["1", "2"] }],
        code: "TEST12",
        topic: "General"
      },
      players: [{ id: "p1", name: "Player 1", score: 0, is_leader: true }, { id: "p2", name: "Player 2", score: 0, is_leader: false }],
      allAnswers: [{ player_id: "p1", question_id: "q1", wager: 5, submitted_answer: "2", is_correct: true }]
    });

    render(<RoomPage params={mockParams} />);

    // Wait for data to load
    const message = await screen.findByText(/Waiting for others to answer/i);
    expect(message).toBeDefined();
    
    // Text SHOULD be visible in question phase
    expect(screen.getByText(/What is 1\+1\?/i)).toBeDefined();
  });
});
