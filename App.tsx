
import React, { useState, useEffect, useMemo } from 'react';
import { OfficialDraw, UserGame, ConcursoResult } from './types';
import { parseNumbers, parseOfficialLine, checkResults, exportToTSV } from './utils/lottery';
import { smartParseOfficialData, analyzeGames } from './services/geminiService';
import { InputCard } from './components/InputCard';

const App: React.FC = () => {
  // State
  const [rawOficiais, setRawOficiais] = useState('');
  const [rawJogos, setRawJogos] = useState('');

  const [oficiais, setOficiais] = useState<OfficialDraw[]>([]);
  const [userGames, setUserGames] = useState<UserGame[]>([]);

  const [isParsingOficiais, setIsParsingOficiais] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [results, setResults] = useState<ConcursoResult[]>([]);

  // Automatic recognition for Jogos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!rawJogos.trim()) {
        setUserGames([]);
        return;
      }
      const lines = rawJogos.split('\n');
      const parsed = lines.map((line, idx) => ({
        id: `game-${idx}`,
        numeros: parseNumbers(line)
      })).filter(g => g.numeros.length === 15).slice(0, 50000);
      setUserGames(parsed);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawJogos]);

  // Automatic recognition for Official Results
  useEffect(() => {
    if (!rawOficiais.trim()) {
      setOficiais([]);
      return;
    }
    const lines = rawOficiais.split('\n');
    const localParsed = lines.map(parseOfficialLine).filter((o): o is OfficialDraw => o !== null);
    setOficiais(localParsed);

    const needsAI = localParsed.length === 0 || rawOficiais.length > 500;
    if (needsAI) {
      const timer = setTimeout(async () => {
        setIsParsingOficiais(true);
        try {
          const aiParsed = await smartParseOfficialData(rawOficiais);
          if (aiParsed && aiParsed.length > 0) {
            setOficiais(aiParsed);
          }
        } catch (err) {
          console.warn("AI parsing failed", err);
        } finally {
          setIsParsingOficiais(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [rawOficiais]);

  const handleConferir = () => {
    const res = checkResults(oficiais, userGames);
    setResults(res);
  };

  const handleAiAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const allGames = userGames.map(g => g.numeros);
      if (allGames.length === 0) return;
      const analysis = await analyzeGames(allGames);
      setAiSummary(analysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyExcel = () => {
    const tsv = exportToTSV(results);
    navigator.clipboard.writeText(tsv).then(() => alert("Copiado! Cada número do jogo premiado está em uma coluna individual."));
  };

  // Sort results by highest hit level available in the contest (Higher prizes first)
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      for (let hit = 15; hit >= 11; hit--) {
        const aCount = a.hits[hit]?.length || 0;
        const bCount = b.hits[hit]?.length || 0;
        if (aCount > 0 && bCount === 0) return -1;
        if (bCount > 0 && aCount === 0) return 1;
        if (aCount !== bCount) return bCount - aCount;
      }
      return 0;
    });
  }, [results]);

  const globalStats = useMemo(() => {
    const stats = { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0 };
    results.forEach(res => {
      [15, 14, 13, 12, 11].forEach(hit => {
        stats[hit as 15 | 14 | 13 | 12 | 11] += res.hits[hit].length;
      });
    });
    return stats;
  }, [results]);

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-green-700 text-white py-8 px-4 shadow-lg mb-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-md">
              <span className="text-green-800 font-black text-xl italic">PRO</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase">Lotofácil Pro AI</h1>
              <p className="text-green-100 text-sm font-medium">Conferidor Profissional Inteligente</p>
            </div>
          </div>
          <div className="flex gap-4">
             <button
              onClick={handleConferir}
              disabled={oficiais.length === 0 || userGames.length === 0}
              className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-400 text-green-900 px-10 py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              CONFERIR AGORA
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Inputs (Visible Content in Black) */}
        <div className="lg:col-span-5 space-y-6">
          <InputCard
            title="Resultados Oficiais"
            description="Cole os resultados oficiais (Ex: 0001 (data) 01 02...)"
            placeholder="0001 (29/09/2003) 02 03 05 06 09 10 11 13 14 16 18 20 23 24 25"
            value={rawOficiais}
            onChange={setRawOficiais}
            onClear={() => setRawOficiais('')}
            count={oficiais.length}
            isLoading={isParsingOficiais}
          />

          <InputCard
            title="Seus Jogos / Fechamento"
            description="Insira até 50.000 jogos (um por linha)."
            placeholder="01 02 03 04 05 06 07 08 09 10 11 12 13 14 15"
            value={rawJogos}
            onChange={setRawJogos}
            onClear={() => setRawJogos('')}
            count={userGames.length}
          />
        </div>

        {/* Right Column - Results Dashboard */}
        <div className="lg:col-span-7 space-y-6">
          {/* Global Summary Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Acertos Totais (Geral)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[15, 14, 13, 12, 11].map(hit => (
                <div key={hit} className={`p-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                  globalStats[hit as 15|14|13|12|11] > 0 
                  ? hit === 15 ? 'bg-yellow-400 border-yellow-500 text-yellow-950 shadow-md' : 
                    hit === 14 ? 'bg-blue-600 border-blue-700 text-white shadow-md' : 
                    'bg-green-50 border-green-200 text-green-800'
                  : 'bg-slate-50 border-slate-100 text-slate-300'
                }`}>
                  <span className="text-2xl font-black">{globalStats[hit as 15|14|13|12|11]}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{hit} Pontos</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Panel */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border-l-8 border-purple-500">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Análise de Distribuição
              </h3>
              <button
                onClick={handleAiAnalyze}
                disabled={isAnalyzing || userGames.length === 0}
                className="text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 px-4 py-1.5 rounded-full transition-all font-bold shadow-lg uppercase tracking-wider"
              >
                {isAnalyzing ? 'Processando...' : 'Analisar Estatísticas'}
              </button>
            </div>
            {aiSummary ? (
              <p className="text-slate-300 text-sm leading-relaxed italic font-medium">"{aiSummary}"</p>
            ) : (
              <p className="text-slate-500 text-sm italic font-light">Analise o equilíbrio estatístico dos seus cartões clicando no botão acima.</p>
            )}
          </div>

          {/* Detailed Results List (Ordered with highest hits first) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800">Conferência Detalhada</h2>
                {results.length > 0 && (
                  <button
                    onClick={handleCopyExcel}
                    className="text-sm text-green-700 font-black hover:bg-green-100 bg-green-50 px-4 py-2 rounded-xl border border-green-200 transition-colors shadow-sm"
                  >
                    COPIAR VENCEDORES PARA EXCEL
                  </button>
                )}
              </div>
              {results.length > 0 && (
                <p className="text-[10px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-normal italic">
                  Clique em 'Copiar Vencedores para Excel' para copiar todos os jogos premiados (15 e 14 acertos) no formato tabular compatível com Excel: cada linha contém Concurso | Acertos | Dezena1 | Dezena2 | ... | Dezena15. Cole diretamente em uma planilha para analisar ou organizar seus acertos.
                </p>
              )}
            </div>

            {sortedResults.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <div className="mb-4 text-slate-100">
                  <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="font-bold text-slate-400">Dados processados aparecerão aqui.</p>
                <p className="text-xs max-w-[250px] mx-auto mt-2">Concursos com premiações de 15 e 14 pontos são automaticamente movidos para o topo.</p>
              </div>
            ) : (
              <div className="max-h-[800px] overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                {sortedResults.map((res) => (
                  <div key={res.concurso} className={`border rounded-2xl p-5 bg-white transition-all hover:shadow-lg ${
                    res.hits[15].length > 0 ? 'border-yellow-400 border-l-8 border-l-yellow-400 ring-1 ring-yellow-100' : 
                    res.hits[14].length > 0 ? 'border-blue-400 border-l-8 border-l-blue-400 ring-1 ring-blue-50' : 
                    'border-slate-100'
                  }`}>
                    <div className="flex justify-between items-center mb-5">
                      <h4 className="font-black text-slate-900 text-lg flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${res.hits[15].length > 0 ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
                        CONCURSO {res.concurso}
                      </h4>
                      <div className="flex gap-2">
                        {res.hits[15].length > 0 && <span className="text-[10px] font-black bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">15 PONTOS!</span>}
                        {res.hits[14].length > 0 && <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">14 PONTOS</span>}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {[15, 14, 13, 12, 11].map(hit => {
                        const hitGroup = res.hits[hit];
                        if (hitGroup.length === 0) return null;

                        return (
                          <div key={hit} className="space-y-2">
                            <div className="flex items-center gap-2 border-b border-slate-50 pb-1">
                              <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                                hit === 15 ? 'bg-yellow-400 text-yellow-950' : 
                                hit === 14 ? 'bg-blue-600 text-white' : 
                                'bg-slate-200 text-slate-700'
                              }`}>
                                {hit} PONTOS: {hitGroup.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                              {hitGroup.map((match, i) => (
                                <div key={i} className={`text-[11px] font-mono p-3 rounded-xl border flex items-center justify-between transition-colors shadow-sm ${
                                  hit === 15 ? 'bg-yellow-50 border-yellow-200' : 
                                  hit === 14 ? 'bg-blue-50 border-blue-100' : 
                                  'bg-slate-50 border-slate-100'
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <span className="text-slate-400 font-bold w-6 text-right">#{match.gameIndex + 1}</span>
                                    <div className="flex flex-wrap gap-1">
                                      {match.game.map((n, idx) => (
                                        <span key={idx} className={`w-6 h-6 flex items-center justify-center rounded-full border text-[10px] font-bold ${
                                          hit === 15 ? 'bg-white border-yellow-300 text-yellow-900 shadow-sm' : 
                                          hit === 14 ? 'bg-white border-blue-200 text-blue-800 shadow-sm' : 
                                          'bg-white border-slate-200 text-slate-700'
                                        }`}>
                                          {n.toString().padStart(2, '0')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* Mobile CTA */}
      <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
        <button
          onClick={handleConferir}
          disabled={oficiais.length === 0 || userGames.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black shadow-2xl transition-all active:scale-95 disabled:bg-slate-400 disabled:shadow-none border-b-4 border-green-900 uppercase"
        >
          Conferir Agora
        </button>
      </div>
    </div>
  );
};

export default App;
