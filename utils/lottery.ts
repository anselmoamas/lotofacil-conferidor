
import { OfficialDraw, UserGame, ConcursoResult, PrizeConfig } from '../types';

export const parseNumbers = (text: string): number[] => {
  return text.trim().split(/[\s,.;]+/)
    .map(n => parseInt(n, 10))
    .filter(n => !isNaN(n) && n >= 1 && n <= 25);
};

export const parseOfficialLine = (line: string): OfficialDraw | null => {
  const matchFull = line.match(/^(\d+)\s*\(([^)]+)\)\s*(.*)$/);
  
  if (matchFull) {
    const numeros = parseNumbers(matchFull[3]);
    if (numeros.length === 15) {
      return {
        concurso: matchFull[1],
        data: matchFull[2],
        numeros
      };
    }
  }

  const justNumbers = parseNumbers(line);
  if (justNumbers.length === 15) {
    return {
      concurso: '?',
      data: '',
      numeros: justNumbers
    };
  }

  return null;
};

export const getIntersectionSize = (setA: number[], setB: number[]): number => {
  const bSet = new Set(setB);
  return setA.filter(n => bSet.has(n)).length;
};

export const checkResults = (
  oficiais: OfficialDraw[],
  jogos: UserGame[],
  premios: PrizeConfig = {}
): ConcursoResult[] => {
  return oficiais.map(oficial => {
    const hits: { [key: number]: any[] } = { 15: [], 14: [], 13: [], 12: [], 11: [] };
    let totalPrize = 0;

    jogos.forEach((game, idx) => {
      const count = getIntersectionSize(game.numeros, oficial.numeros);
      if (count >= 11) {
        hits[count].push({
          gameIndex: idx,
          game: [...game.numeros].sort((a, b) => a - b),
          acertos: count
        });
      }
    });

    const contestPrizes = premios[oficial.concurso] || {};
    [15, 14, 13, 12, 11].forEach(acerto => {
      const prizeValue = contestPrizes[acerto] || 0;
      totalPrize += hits[acerto].length * prizeValue;
    });

    return {
      concurso: oficial.concurso,
      hits,
      totalPrize
    };
  });
};

export const exportToTSV = (results: ConcursoResult[]): string => {
  // Creating header with 15 separate columns for numbers
  let tsv = "Concurso\tAcertos\tDezena1\tDezena2\tDezena3\tDezena4\tDezena5\tDezena6\tDezena7\tDezena8\tDezena9\tDezena10\tDezena11\tDezena12\tDezena13\tDezena14\tDezena15\n";
  
  // Flatten all matches across all contests
  const allMatches: { concurso: string, acertos: number, game: number[] }[] = [];
  
  results.forEach(res => {
    [15, 14, 13, 12, 11].forEach(acerto => {
      res.hits[acerto].forEach(match => {
        allMatches.push({
          concurso: res.concurso,
          acertos: acerto,
          game: match.game
        });
      });
    });
  });

  // Sort strictly by acertos descending so higher prizes appear first
  allMatches.sort((a, b) => b.acertos - a.acertos);

  allMatches.forEach(m => {
    const gameCols = m.game.join('\t');
    tsv += `${m.concurso}\t${m.acertos}\t${gameCols}\n`;
  });
  
  return tsv;
};
