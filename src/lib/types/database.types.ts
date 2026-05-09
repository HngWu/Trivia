export type Database = {
  public: {
    Tables: {
      topics: {
        Row: {
          id: string;
          name: string;
          icon: string;
          description: string | null;
          example_question: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          icon: string;
          description?: string | null;
          example_question?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['topics']['Insert']>;
      };
      questions: {
        Row: {
          id: string;
          topic: string;
          summary: string;
          text: string;
          type: 'text' | 'boolean' | 'multiple_choice';
          options: string[] | null;
          correct_answer: string;
          explanation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic: string;
          summary: string;
          text: string;
          type: 'text' | 'boolean' | 'multiple_choice';
          options?: string[] | null;
          correct_answer: string;
          explanation?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['questions']['Insert']>;
      };
    };
  };
};
