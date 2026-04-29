export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          code: string;
          status: string;
          leader_id: string;
          current_question_index: number;
          topic: string;
        };
        Insert: {
          id?: string;
          code: string;
          status?: string;
          leader_id: string;
          current_question_index?: number;
          topic: string;
        };
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
      };
      players: {
        Row: {
          id: string;
          room_id: string;
          name: string;
          score: number;
          available_weights: number[];
          is_leader: boolean;
        };
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id' | 'score' | 'available_weights'>;
        Update: Partial<Database['public']['Tables']['players']['Row']>;
      };
      questions: {
        Row: {
          id: string;
          room_id: string;
          summary: string;
          text: string;
          type: 'text' | 'boolean' | 'multiple_choice';
          options: string[] | null;
          correct_answer: string;
        };
        Insert: Database['public']['Tables']['questions']['Row'];
        Update: Partial<Database['public']['Tables']['questions']['Row']>;
      };
      answers: {
        Row: {
          id: string;
          question_id: string;
          player_id: string;
          wager: number;
          submitted_answer: string;
          is_correct: boolean;
        };
        Insert: Database['public']['Tables']['answers']['Row'];
        Update: Partial<Database['public']['Tables']['answers']['Row']>;
      };
    };
  };
};
