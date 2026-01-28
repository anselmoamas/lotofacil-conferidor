
export interface OfficialDraw {
  concurso: string;
  data: string;
  numeros: number[];
}

export interface UserGame {
  id: string;
  numeros: number[];
}

export interface PrizeConfig {
  [concurso: string]: {
    [acertos: number]: number;
  };
}

export interface ResultMatch {
  gameIndex: number;
  game: number[];
  acertos: number;
}

export interface ConcursoResult {
  concurso: string;
  hits: {
    [acertos: number]: ResultMatch[];
  };
  totalPrize: number;
}

export interface AIAnalysis {
  recommendation: string;
  stats: {
    evenCount: number;
    oddCount: number;
    sum: number;
    primes: number[];
  };
}
