export type Question = {
  id: string;
  summary: string;
  text: string;
  type: "multiple_choice" | "boolean" | "text";
  options: string[] | null;
  correct_answer: string;
  explanation?: string;
};

export type Player = {
  id: string;
  name: string;
  score: number;
  is_leader: boolean;
};

export type Answer = {
  player_id: string;
  question_id: string;
  wager: number;
  submitted_answer: string;
  is_correct: boolean;
};

export type GameState = "waiting" | "wager" | "question" | "results" | "final";

export type Room = {
  code: string;
  topic: string;
  status: string;
  current_question_index: number;
  leader_id: string;
  questions: Question[];
  status_updated_at?: number;
};
